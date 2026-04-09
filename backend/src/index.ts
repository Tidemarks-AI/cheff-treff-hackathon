import { pipeline } from "node:stream/promises";
import express from "express";
import cors from "cors";
import multer from "multer";
import { RunState, run, type RunResult } from "@openai/agents";
import { getSupabase } from "./lib/supabase.js";
import { getOpenAI } from "./lib/openai.js";
import { Table } from "surrealdb";
import { getCompanyDB } from "./lib/surrealdb.js";
import {
  isExternalTable,
  hydrateTable,
  getEmployeeCompensation,
} from "./lib/hydration.js";
import { getAgent, getDefaultAgentId, listAgents } from "./lib/agents.js";
import {
  getToolDefinition,
  listFunctionDefinitions,
  type PolicyFieldType,
} from "../tools.js";
import {
  createPendingApprovals,
  deletePendingApproval,
  getPendingApproval,
  listPendingApprovals,
  updatePendingApproval,
} from "./lib/approvals.js";
import {
  handleDiscordInteraction,
  markDiscordApprovalResolved,
  postApprovalToDiscord,
  setApprovalDecisionHandler,
  setChangeRequestDecisionHandler,
} from "./lib/discord-approvals.js";
import {
  createPolicy,
  deletePolicy,
  getPolicy,
  getToolPolicyDecision,
  type FunctionPolicyDraftCondition,
  listPolicies,
  updatePolicy,
  type PolicyAction,
  type PolicyConditionGroup,
  type FunctionPolicyDraft,
  type PolicyOperator,
} from "./lib/policies.js";
import {
  approveChangeRequest,
  applyChangeRequestProposal,
  createChangeRequest,
  getChangeRequest,
  listChangeRequests,
  rejectChangeRequest,
  updateChangeRequestDiscord,
} from "./lib/change-requests.js";
import { addSSEClient, broadcastSSE } from "./lib/sse.js";
import { seedForecastBase } from "./lib/fixtures.js";
import {
  postChangeRequestToDiscord,
  markChangeRequestDiscordResolved,
} from "./lib/discord-change-requests.js";

const app = express();
const PORT = process.env.PORT || 3001;

const policyOperatorsByType: Record<PolicyFieldType, PolicyOperator[]> = {
  string: ["eq", "neq", "contains"],
  number: ["eq", "neq", "lt", "lte", "gt", "gte"],
  boolean: ["eq", "neq"],
};

function normalizePolicyValue(value: unknown, fieldType: PolicyFieldType) {
  if (fieldType === "number") {
    const normalizedValue = typeof value === "number" ? value : Number(value);

    if (Number.isNaN(normalizedValue)) {
      throw new Error("Policy value must be a valid number");
    }

    return normalizedValue;
  }

  if (fieldType === "boolean") {
    if (typeof value === "boolean") {
      return value;
    }

    if (value === "true") {
      return true;
    }

    if (value === "false") {
      return false;
    }

    throw new Error("Policy value must be true or false");
  }

  return String(value ?? "");
}

function validatePolicyDraft(
  body: Record<string, unknown>,
  currentToolName?: string,
): FunctionPolicyDraft {
  const toolName = String(body.toolName ?? currentToolName ?? "");
  const action = (body.action as PolicyAction | undefined) ?? "auto_allow";
  const conditionGroup =
    (body.conditionGroup as PolicyConditionGroup | undefined) ?? "all";
  const enabled = body.enabled === undefined ? true : Boolean(body.enabled);

  const toolDefinition = getToolDefinition(
    toolName as keyof typeof import("../tools.js").toolRegistry,
  );

  if (!toolDefinition) {
    throw new Error(`Unknown function '${toolName}'`);
  }

  if (toolDefinition.access !== "mutating") {
    throw new Error("Policies are only supported for mutating functions");
  }

  if (action !== "auto_allow" && action !== "auto_deny") {
    throw new Error(`Unknown policy action '${String(action)}'`);
  }

  if (conditionGroup !== "all" && conditionGroup !== "any") {
    throw new Error(`Unknown condition group '${String(conditionGroup)}'`);
  }

  const conditionsInput = Array.isArray(body.conditions) ? body.conditions : [];

  if (conditionsInput.length === 0) {
    throw new Error("Policies must define at least one condition");
  }

  const conditions = conditionsInput.map((condition, index) => {
    if (!condition || typeof condition !== "object") {
      throw new Error(`Condition ${index + 1} is invalid`);
    }

    const field = String((condition as Record<string, unknown>).field ?? "");
    const operator = (condition as Record<string, unknown>)
      .operator as PolicyOperator;
    const policyField = toolDefinition.policyFields.find(
      (entry) => entry.name === field,
    );

    if (!policyField) {
      throw new Error(
        `Unknown policy field '${field}' for function '${toolName}'`,
      );
    }

    if (!policyOperatorsByType[policyField.type].includes(operator)) {
      throw new Error(
        `Operator '${operator}' is not valid for field '${field}'`,
      );
    }

    return {
      field,
      operator,
      value: normalizePolicyValue(
        (condition as Record<string, unknown>).value,
        policyField.type,
      ),
    } satisfies FunctionPolicyDraftCondition;
  });

  return {
    toolName,
    action,
    conditionGroup,
    conditions,
    enabled,
  };
}

function formatReply(output: unknown) {
  return typeof output === "string" ? output : JSON.stringify(output);
}

async function createRunResponse<TContext>(
  agentId: string,
  result: RunResult<TContext, any>,
) {
  if (result.interruptions.length > 0) {
    const approvals = await createPendingApprovals(agentId, result);

    const approvalsWithDiscordState = await Promise.all(
      approvals.map(async (approval) => {
        const discordMessage = await postApprovalToDiscord(approval);

        if (discordMessage) {
          return (
            (await updatePendingApproval(approval.id, discordMessage)) ??
            approval
          );
        }

        return approval;
      }),
    );

    return {
      agentId,
      status: "approval_required" as const,
      approvals: approvalsWithDiscordState,
    };
  }

  return {
    agentId,
    status: "completed" as const,
    reply: formatReply(result.finalOutput),
  };
}

async function resolvePendingApproval(
  approvalId: string,
  decision: "allow" | "deny",
  source: string,
) {
  const approval = await getPendingApproval(approvalId);

  if (!approval) {
    throw new Error(`Unknown approval '${approvalId}'`);
  }

  const agent = await getAgent(approval.agentId);

  if (!agent) {
    throw new Error(`Unknown agent '${approval.agentId}'`);
  }

  const runState = await RunState.fromString(agent, approval.runState);
  const approvalItem = runState
    .getInterruptions()
    .find(
      (item: { rawItem?: { type?: string; callId?: string } }) =>
        item.rawItem?.type === "function_call" &&
        item.rawItem.callId === approval.callId,
    );

  if (!approvalItem) {
    await deletePendingApproval(approvalId);
    throw new Error("Approval is no longer pending");
  }

  if (decision === "allow") {
    runState.approve(approvalItem);
  } else {
    runState.reject(approvalItem);
  }

  await deletePendingApproval(
    approvalId,
    decision === "allow" ? "allowed" : "denied",
    source,
  );
  await markDiscordApprovalResolved(approval, decision, source);

  const result = await run(agent, runState);
  return createRunResponse(approval.agentId, result);
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
});

// Wire up the Discord interaction handler to resolve approvals
setApprovalDecisionHandler(async (approvalId, decision, source) => {
  await resolvePendingApproval(approvalId, decision, source);
});

// Wire up Discord handler for change request buttons
setChangeRequestDecisionHandler(async (changeId, decision, source) => {
  const surrealDbName = process.env.DEFAULT_SURREAL_DB || "acme_startup_gmbh";
  const db = await getCompanyDB(surrealDbName);
  try {
    const cr =
      decision === "allow"
        ? await approveChangeRequest(db, changeId, source)
        : await rejectChangeRequest(db, changeId, source);

    if (!cr) throw new Error(`Unknown change request '${changeId}'`);

    if (decision === "allow") {
      await applyChangeRequestProposal(db, cr);
    }

    await markChangeRequestDiscordResolved(cr, decision, source);
    broadcastSSE("change:updated", cr);
  } finally {
    await db.close();
  }
});

// Seed a default policy: fixed costs > 3000 EUR require approval
const existingPolicies = listPolicies();
if (!existingPolicies.some((p) => p.toolName === "createFixedCost")) {
  createPolicy({
    toolName: "createFixedCost",
    action: "auto_deny",
    conditionGroup: "all",
    conditions: [{ field: "monthly_amount", operator: "gt", value: 3000 }],
    enabled: true,
  });
  console.log("Seeded default policy: createFixedCost monthly_amount > 3000");
}

const allowedOrigins: (string | RegExp)[] = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map((o) => o.trim())
  : [/localhost:\d+/];
if (process.env.VERCEL) {
  allowedOrigins.push(/\.vercel\.app$/);
}
app.use(cors({ origin: allowedOrigins }));

// Discord interactions endpoint needs raw body for signature verification.
// Must be registered before express.json() middleware.
app.post(
  "/api/discord/interactions",
  express.raw({ type: "application/json" }),
  handleDiscordInteraction,
);

app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ── SurrealDB company data routes ───────────────────────────

// Resolve user's company database from Supabase auth token
async function resolveCompanyDB(req: express.Request): Promise<string> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("Missing authorization header");
  }

  const token = authHeader.slice(7);
  const supabase = getSupabase();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) {
    throw new Error("Invalid auth token");
  }

  // Check for explicit db query param first, then look up user's default company qwer
  const dbParam = req.query.db as string | undefined;
  if (dbParam) return dbParam;

  const { data: mappings } = await supabase
    .from("user_companies")
    .select("surreal_db")
    .eq("user_id", user.id)
    .limit(1);

  if (!mappings || mappings.length === 0) {
    throw new Error("User has no company assigned");
  }

  return mappings[0].surreal_db;
}

// Generic query endpoint for SurrealDB
app.post("/api/surreal/query", async (req, res) => {
  try {
    const surrealDbName = await resolveCompanyDB(req);
    const db = await getCompanyDB(surrealDbName);
    try {
      const { query, vars } = req.body;
      const result = await db.query(query, vars);
      res.json({ data: result });
    } finally {
      await db.close();
    }
  } catch (e) {
    const msg = (e as Error).message;
    const status =
      msg === "Missing authorization header" || msg === "Invalid auth token"
        ? 401
        : 500;
    res.status(status).json({ error: (e as Error).message });
  }
});

// Get all records from a table (hydrates external data from Personio/HubSpot)
app.get("/api/surreal/:table", async (req, res) => {
  try {
    const surrealDbName = await resolveCompanyDB(req);
    const db = await getCompanyDB(surrealDbName);
    try {
      const { table } = req.params;
      const result = await db.select(new Table(table));
      const records = Array.isArray(result) ? result : [result].filter(Boolean);
      const data = isExternalTable(table)
        ? await hydrateTable(table, records)
        : records;
      res.json({ data });
    } finally {
      await db.close();
    }
  } catch (e) {
    const status = (e as Error).message.includes("auth") ? 401 : 500;
    res.status(status).json({ error: (e as Error).message });
  }
});

// Get compensation for an employee (fetched from Personio, replaces salary table)
app.get("/api/employees/:id/compensation", async (req, res) => {
  try {
    const surrealDbName = await resolveCompanyDB(req);
    const db = await getCompanyDB(surrealDbName);
    try {
      const result = await db.query<[any[]]>(
        `SELECT * FROM employee:${req.params.id}`,
      );
      const employee = result[0]?.[0];
      if (!employee) {
        res.status(404).json({ error: "Employee not found" });
        return;
      }
      const personioId = (employee as any).personio_employee_id;
      if (!personioId) {
        res.status(404).json({ error: "Employee has no Personio link" });
        return;
      }
      const compensation = await getEmployeeCompensation(personioId);
      res.json({ data: compensation });
    } finally {
      await db.close();
    }
  } catch (e) {
    const msg = (e as Error).message;
    const status =
      msg === "Missing authorization header" || msg === "Invalid auth token"
        ? 401
        : 500;
    res.status(status).json({ error: (e as Error).message });
  }
});

// Create a record in a table
app.post("/api/surreal/:table", async (req, res) => {
  try {
    const surrealDbName = await resolveCompanyDB(req);
    const db = await getCompanyDB(surrealDbName);
    try {
      const { table } = req.params;
      const result = await db.insert(new Table(table), req.body);
      res.status(201).json({ data: result });
    } finally {
      await db.close();
    }
  } catch (e) {
    const msg = (e as Error).message;
    const status =
      msg === "Missing authorization header" || msg === "Invalid auth token"
        ? 401
        : 500;
    res.status(status).json({ error: (e as Error).message });
  }
});

// Get user's company mappings
app.get("/api/user-companies", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      res.status(401).json({ error: "Missing authorization header" });
      return;
    }

    const token = authHeader.slice(7);
    const supabase = getSupabase();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      res.status(401).json({ error: "Invalid auth token" });
      return;
    }

    const { data: companies } = await supabase
      .from("user_companies")
      .select("*")
      .eq("user_id", user.id);

    res.json({ companies: companies || [] });
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

// ── Change Request routes ───────────────────────────────────

app.get("/api/stream", (req, res) => {
  addSSEClient(res);
});

app.get("/api/changes", async (req, res) => {
  try {
    const surrealDbName = await resolveCompanyDB(req);
    const db = await getCompanyDB(surrealDbName);
    try {
      const changes = await listChangeRequests(db);
      res.json({ changes });
    } finally {
      await db.close();
    }
  } catch (e) {
    const msg = (e as Error).message;
    const status =
      msg === "Missing authorization header" || msg === "Invalid auth token"
        ? 401
        : 500;
    res.status(status).json({ error: (e as Error).message });
  }
});

app.get("/api/ontology/finance", async (req, res) => {
  try {
    const surrealDbName = await resolveCompanyDB(req);
    const db = await getCompanyDB(surrealDbName);
    try {
      // Query finance data from SurrealDB
      const [costCenters] = await db.query<[Array<Record<string, unknown>>]>(
        "SELECT * FROM cost_center",
      );
      const [fixedExpenses] = await db.query<[Array<Record<string, unknown>>]>(
        "SELECT * FROM fixed_expense",
      );
      const [budgetLines] = await db.query<[Array<Record<string, unknown>>]>(
        "SELECT * FROM budget_line",
      );
      const [costs] = await db.query<[Array<Record<string, unknown>>]>(
        "SELECT * FROM costs",
      );
      const [variances] = await db.query<[Array<Record<string, unknown>>]>(
        "SELECT * FROM variance",
      );
      const [bankAccounts] = await db.query<[Array<Record<string, unknown>>]>(
        "SELECT * FROM bank_account",
      );
      const [runwayCalcs] = await db.query<[Array<Record<string, unknown>>]>(
        "SELECT * FROM runway_calculation",
      );
      const [forecasts] = await db.query<[Array<Record<string, unknown>>]>(
        "SELECT * FROM financial_forecast",
      );

      const totalFixedMonthly = (fixedExpenses ?? []).reduce(
        (sum, fe) => sum + Number(fe.amount ?? 0),
        0,
      );
      const flaggedVariances = (variances ?? []).filter(
        (v) => v.status === "flagged",
      ).length;
      const bankBalance = (bankAccounts ?? [])[0]?.current_balance
        ? Number((bankAccounts ?? [])[0].current_balance)
        : null;
      const runway = (runwayCalcs ?? [])[0];
      const runwayMonths = runway ? Number(runway.months_remaining ?? 0) : null;

      // Build graph with real summaries
      const graph = {
        nodes: [
          {
            id: "cost_center",
            label: "Cost Centers",
            count: (costCenters ?? []).length,
          },
          {
            id: "budget_line",
            label: "Budget Lines",
            count: (budgetLines ?? []).length,
          },
          {
            id: "fixed_expense",
            label: "Fixed Expenses",
            count: (fixedExpenses ?? []).length,
            totalMonthly: totalFixedMonthly,
          },
          {
            id: "costs",
            label: "Costs (Actuals)",
            count: (costs ?? []).length,
          },
          {
            id: "variance",
            label: "Variances",
            count: (variances ?? []).length,
            flagged: flaggedVariances,
          },
          {
            id: "forecast",
            label: "Forecast",
            count: (forecasts ?? []).length,
          },
          { id: "runway", label: "Runway", months: runwayMonths },
          { id: "bank", label: "Bank Account", balance: bankBalance },
        ],
        edges: [
          { source: "cost_center", target: "fixed_expense", label: "owns" },
          { source: "cost_center", target: "budget_line", label: "owns" },
          { source: "cost_center", target: "costs", label: "incurs" },
          { source: "budget_line", target: "variance", label: "planned" },
          { source: "costs", target: "variance", label: "actual" },
          { source: "variance", target: "forecast", label: "informs" },
          { source: "forecast", target: "runway", label: "informs" },
          { source: "runway", target: "bank", label: "uses" },
        ],
      };

      res.json({
        graph,
        forecastBase: seedForecastBase(),
      });
    } finally {
      await db.close();
    }
  } catch (e) {
    const msg = (e as Error).message;
    const status =
      msg === "Missing authorization header" || msg === "Invalid auth token"
        ? 401
        : 500;
    res.status(status).json({ error: (e as Error).message });
  }
});

app.post("/api/changes/:id/approve", async (req, res) => {
  try {
    const surrealDbName = await resolveCompanyDB(req);
    const db = await getCompanyDB(surrealDbName);
    try {
      const cr = await approveChangeRequest(db, req.params.id, "ui");
      if (!cr) {
        res
          .status(404)
          .json({ error: `Unknown change request '${req.params.id}'` });
        return;
      }

      await applyChangeRequestProposal(db, cr);
      broadcastSSE("change:updated", cr);
      markChangeRequestDiscordResolved(cr, "allow", "ui").catch(() => {});

      res.json({ change: cr });
    } finally {
      await db.close();
    }
  } catch (e) {
    const msg = (e as Error).message;
    const status =
      msg === "Missing authorization header" || msg === "Invalid auth token"
        ? 401
        : 500;
    res.status(status).json({ error: (e as Error).message });
  }
});

app.post("/api/changes/:id/reject", async (req, res) => {
  try {
    const surrealDbName = await resolveCompanyDB(req);
    const db = await getCompanyDB(surrealDbName);
    try {
      const cr = await rejectChangeRequest(db, req.params.id, "ui");
      if (!cr) {
        res
          .status(404)
          .json({ error: `Unknown change request '${req.params.id}'` });
        return;
      }

      broadcastSSE("change:updated", cr);
      markChangeRequestDiscordResolved(cr, "deny", "ui").catch(() => {});

      res.json({ change: cr });
    } finally {
      await db.close();
    }
  } catch (e) {
    const msg = (e as Error).message;
    const status =
      msg === "Missing authorization header" || msg === "Invalid auth token"
        ? 401
        : 500;
    res.status(status).json({ error: (e as Error).message });
  }
});

// ── Legacy routes ───────────────────────────────────────────

app.get("/api/test-db", async (_req, res) => {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase.from("_test").select("*").limit(1);
    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }
    res.json({ data });
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

app.post("/api/transcribe", upload.single("file"), async (req, res) => {
  try {
    const openai = getOpenAI();
    const file = req.file;
    if (!file) {
      res.status(400).json({ error: "No audio file provided" });
      return;
    }

    const audioFile = new File(
      [new Uint8Array(file.buffer)],
      file.originalname || "recording.wav",
      {
        type: file.mimetype || "audio/wav",
      },
    );

    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-1",
    });

    res.json({ text: transcription.text });
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

app.post("/api/chat", async (req, res) => {
  try {
    const openai = getOpenAI();
    const { message } = req.body;
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: message || "Hello!" }],
    });
    res.json({ reply: completion.choices[0].message.content });
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

app.get("/api/agents", async (_req, res) => {
  try {
    res.json({ agents: await listAgents() });
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

app.get("/api/approvals", async (_req, res) => {
  try {
    res.json({ approvals: await listPendingApprovals() });
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

app.get("/api/functions", (_req, res) => {
  res.json({ functions: listFunctionDefinitions() });
});

app.get("/api/policies", (_req, res) => {
  res.json({ policies: listPolicies() });
});

app.post("/api/policies", (req, res) => {
  try {
    const policy = createPolicy(
      validatePolicyDraft(req.body as Record<string, unknown>),
    );
    res.status(201).json({ policy });
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

app.patch("/api/policies/:policyId", (req: any, res: any) => {
  try {
    const { policyId } = req.params;
    const existingPolicy = getPolicy(policyId);

    if (!existingPolicy) {
      res.status(404).json({ error: `Unknown policy '${policyId}'` });
      return;
    }

    const policy = updatePolicy(
      policyId,
      validatePolicyDraft(
        { ...existingPolicy, ...(req.body as Record<string, unknown>) },
        existingPolicy.toolName,
      ),
    );

    res.json({ policy });
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

app.delete("/api/policies/:policyId", (req: any, res: any) => {
  const { policyId } = req.params;

  if (!deletePolicy(policyId)) {
    res.status(404).json({ error: `Unknown policy '${policyId}'` });
    return;
  }

  res.status(204).end();
});

app.post("/api/agent", async (req: any, res: any) => {
  try {
    const defaultAgentId = await getDefaultAgentId();
    const agentId = req.body.agentId ?? defaultAgentId;

    if (!agentId) {
      res.status(500).json({ error: "No agents are configured" });
      return;
    }

    const { message } = req.body;
    const agent = await getAgent(agentId);

    if (!agent) {
      res.status(404).json({ error: `Unknown agent '${agentId}'` });
      return;
    }

    const result = await run(agent, message || "Hello!");
    res.json(await createRunResponse(agentId, result));
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

app.post("/api/agents/:agentId/run", async (req: any, res: any) => {
  try {
    const { agentId } = req.params;
    const { message } = req.body;
    const agent = await getAgent(agentId);

    if (!agent) {
      res.status(404).json({ error: `Unknown agent '${agentId}'` });
      return;
    }

    const result = await run(agent, message || "Hello!");
    res.json(await createRunResponse(agentId, result));
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

app.post("/api/approvals/:approvalId/accept", async (req: any, res: any) => {
  try {
    const { approvalId } = req.params;
    res.json(await resolvePendingApproval(approvalId, "allow", "ui"));
  } catch (e) {
    const error = e as Error;
    res.status(error.message.startsWith("Unknown approval") ? 404 : 500).json({
      error: error.message,
    });
  }
});

app.post("/api/approvals/:approvalId/deny", async (req: any, res: any) => {
  try {
    const { approvalId } = req.params;
    res.json(await resolvePendingApproval(approvalId, "deny", "ui"));
  } catch (e) {
    const error = e as Error;
    res.status(error.message.startsWith("Unknown approval") ? 404 : 500).json({
      error: error.message,
    });
  }
});

app.post("/api/agents/:agentId/stream", async (req: any, res: any) => {
  const abortController = new AbortController();

  res.on("close", () => {
    if (!res.writableEnded) {
      abortController.abort();
    }
  });

  try {
    const { agentId } = req.params;
    const { message } = req.body;
    const agent = await getAgent(agentId);

    if (!agent) {
      res.status(404).json({ error: `Unknown agent '${agentId}'` });
      return;
    }

    const result = await run(agent, message || "Hello!", {
      stream: true,
      signal: abortController.signal,
    });

    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("X-Accel-Buffering", "no");

    await pipeline(
      result.toTextStream({ compatibleWithNodeStreams: true }),
      res,
    );
    await result.completed;
  } catch (e) {
    if (abortController.signal.aborted) {
      return;
    }

    if (!res.headersSent) {
      res.status(500).json({ error: (e as Error).message });
      return;
    }

    res.end();
  }
});

// ── Gmail OAuth flow endpoints ──────────────────────────────

app.get("/api/auth/gmail", async (_req: any, res: any) => {
  try {
    const { getOAuth2Client } = await import("./lib/gmail.js");
    const oauth2Client = await getOAuth2Client();
    const url = oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: ["https://www.googleapis.com/auth/gmail.modify"],
      prompt: "consent",
    });
    res.redirect(url);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

app.get("/api/auth/gmail/callback", async (req: any, res: any) => {
  try {
    const { getOAuth2Client } = await import("./lib/gmail.js");
    const oauth2Client = await getOAuth2Client();
    const { tokens } = await oauth2Client.getToken(req.query.code as string);
    res.json({
      message: "Add this refresh_token to your .env as GMAIL_REFRESH_TOKEN",
      refresh_token: tokens.refresh_token,
    });
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

// ── Vercel Cron: Gmail poll ────────��───────────────────────

app.get("/api/cron/gmail-poll", async (req, res) => {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && req.headers["authorization"] !== `Bearer ${cronSecret}`) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const { isGmailConfigured } = await import("./lib/gmail.js");
    if (!isGmailConfigured()) {
      res.json({ status: "skipped", reason: "Gmail not configured" });
      return;
    }

    const { pollOnce } = await import("./lib/gmail-poller.js");
    await pollOnce();
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  } catch (e) {
    console.error("Cron gmail-poll error:", e);
    res.status(500).json({ error: (e as Error).message });
  }
});

// ── Start server ───���──────────────────────��─────────────────

if (!process.env.VERCEL) {
  // Start Gmail poller if configured
  import("./lib/gmail-poller.js")
    .then(({ startGmailPoller }) => startGmailPoller())
    .catch(() => console.log("Gmail poller module not available"));

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

export default app;
