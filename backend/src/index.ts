import { pipeline } from "node:stream/promises";
import express from "express";
import cors from "cors";
import { RunState, run, type RunResult } from "@openai/agents";
import { getSupabase } from "./lib/supabase.js";
import { getOpenAI } from "./lib/openai.js";
import { getAgent, getDefaultAgentId, listAgents } from "./lib/agents.js";
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

const app = express();
const PORT = process.env.PORT || 3001;

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
