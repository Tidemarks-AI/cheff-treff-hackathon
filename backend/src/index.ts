import { pipeline } from "node:stream/promises";
import express from "express";
import cors from "cors";
import multer from "multer";
import { RunState, run, type RunResult } from "@openai/agents";
import { getSupabase } from "./lib/supabase.js";
import { getOpenAI } from "./lib/openai.js";
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
  getPendingApprovalByDiscordMessageId,
  listPendingApprovals,
  updatePendingApproval,
} from "./lib/approvals.js";
import {
  initDiscordApprovalBot,
  markDiscordApprovalResolved,
  postApprovalToDiscord,
} from "./lib/discord-approvals.js";
import {
  createPolicy,
  deletePolicy,
  getPolicy,
  type FunctionPolicyDraftCondition,
  listPolicies,
  updatePolicy,
  type PolicyAction,
  type PolicyConditionGroup,
  type FunctionPolicyDraft,
  type PolicyOperator,
} from "./lib/policies.js";

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
  currentToolName?: string
): FunctionPolicyDraft {
  const toolName = String(body.toolName ?? currentToolName ?? "");
  const action = (body.action as PolicyAction | undefined) ?? "auto_allow";
  const conditionGroup = (body.conditionGroup as PolicyConditionGroup | undefined) ?? "all";
  const enabled = body.enabled === undefined ? true : Boolean(body.enabled);

  const toolDefinition = getToolDefinition(toolName as keyof typeof import("../tools.js").toolRegistry);

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
    const operator = (condition as Record<string, unknown>).operator as PolicyOperator;
    const policyField = toolDefinition.policyFields.find((entry) => entry.name === field);

    if (!policyField) {
      throw new Error(`Unknown policy field '${field}' for function '${toolName}'`);
    }

    if (!policyOperatorsByType[policyField.type].includes(operator)) {
      throw new Error(`Operator '${operator}' is not valid for field '${field}'`);
    }

    return {
      field,
      operator,
      value: normalizePolicyValue(
        (condition as Record<string, unknown>).value,
        policyField.type
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
  result: RunResult<TContext, any>
) {
  if (result.interruptions.length > 0) {
    const approvals = createPendingApprovals(agentId, result);

    const approvalsWithDiscordState = await Promise.all(
      approvals.map(async (approval) => {
        const discordMessage = await postApprovalToDiscord(approval);

        if (discordMessage) {
          return updatePendingApproval(approval.id, discordMessage) ?? approval;
        }

        return approval;
      })
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
  source: string
) {
  const approval = getPendingApproval(approvalId);

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
        item.rawItem?.type === "function_call" && item.rawItem.callId === approval.callId
    );

  if (!approvalItem) {
    deletePendingApproval(approvalId);
    throw new Error("Approval is no longer pending");
  }

  if (decision === "allow") {
    runState.approve(approvalItem);
  } else {
    runState.reject(approvalItem);
  }

  deletePendingApproval(approvalId);
  await markDiscordApprovalResolved(approval, decision, source);

  const result = await run(agent, runState);
  return createRunResponse(approval.agentId, result);
}

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

app.use(cors({ origin: process.env.CORS_ORIGIN || "http://localhost:5173" }));
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

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

    const audioFile = new File([file.buffer], file.originalname || "recording.wav", {
      type: file.mimetype || "audio/wav",
    });

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

app.get("/api/approvals", (_req, res) => {
  res.json({ approvals: listPendingApprovals() });
});

app.get("/api/functions", (_req, res) => {
  res.json({ functions: listFunctionDefinitions() });
});

app.get("/api/policies", (_req, res) => {
  res.json({ policies: listPolicies() });
});

app.post("/api/policies", (req, res) => {
  try {
    const policy = createPolicy(validatePolicyDraft(req.body as Record<string, unknown>));
    res.status(201).json({ policy });
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

app.patch("/api/policies/:policyId", (req, res) => {
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
        existingPolicy.toolName
      )
    );

    res.json({ policy });
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

app.delete("/api/policies/:policyId", (req, res) => {
  const { policyId } = req.params;

  if (!deletePolicy(policyId)) {
    res.status(404).json({ error: `Unknown policy '${policyId}'` });
    return;
  }

  res.status(204).end();
});

app.post("/api/agent", async (req, res) => {
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

app.post("/api/agents/:agentId/run", async (req, res) => {
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

app.post("/api/approvals/:approvalId/accept", async (req, res) => {
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

app.post("/api/approvals/:approvalId/deny", async (req, res) => {
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

app.post("/api/agents/:agentId/stream", async (req, res) => {
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
      res
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

if (process.env.VERCEL) {
  // Vercel handles routing via serverless functions
} else {
  void initDiscordApprovalBot(async (discordMessageId, decision, source) => {
    const approval = getPendingApprovalByDiscordMessageId(discordMessageId);

    if (!approval) {
      return;
    }

    await resolvePendingApproval(approval.id, decision, source);
  }).catch((error: Error) => {
    console.warn(`Discord approval bot failed to initialize: ${error.message}`);
  });

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

export default app;
