import { randomUUID } from "node:crypto";
import type { RunResult, RunToolApprovalItem } from "@openai/agents";
import type { Agent } from "@openai/agents";
import { getToolDefinition, type ToolName } from "../../tools.js";

export type PendingApproval = {
  id: string;
  agentId: string;
  toolName: string;
  parameters: unknown;
  description: string;
  createdAt: string;
  callId: string;
  runState: string;
  discordMessageId?: string;
  discordChannelId?: string;
  discordGuildId?: string;
};

const pendingApprovals = new Map<string, PendingApproval>();

function parseToolParameters(argumentsJson: string) {
  try {
    return JSON.parse(argumentsJson);
  } catch {
    return argumentsJson;
  }
}

function toPendingApproval(
  agentId: string,
  runState: string,
  interruption: RunToolApprovalItem
): PendingApproval | null {
  if (interruption.rawItem.type !== "function_call") {
    return null;
  }

  const toolName = interruption.rawItem.name as ToolName;
  const toolDefinition = getToolDefinition(toolName);

  return {
    id: randomUUID(),
    agentId,
    toolName,
    parameters: parseToolParameters(interruption.rawItem.arguments),
    description: toolDefinition?.approvalDescription ?? toolDefinition?.tool.description ?? toolName,
    createdAt: new Date().toISOString(),
    callId: interruption.rawItem.callId,
    runState,
  };
}

export function createPendingApprovals<TContext>(
  agentId: string,
  result: RunResult<TContext, Agent<TContext, any>>
) {
  const runState = result.state.toString();
  const approvals = result.interruptions
    .map((interruption) => toPendingApproval(agentId, runState, interruption))
    .filter((approval): approval is PendingApproval => approval !== null);

  approvals.forEach((approval) => {
    pendingApprovals.set(approval.id, approval);
  });

  return approvals;
}

export function listPendingApprovals() {
  return [...pendingApprovals.values()].sort((a, b) =>
    a.createdAt.localeCompare(b.createdAt)
  );
}

export function getPendingApproval(approvalId: string) {
  return pendingApprovals.get(approvalId);
}

export function getPendingApprovalByDiscordMessageId(discordMessageId: string) {
  return [...pendingApprovals.values()].find(
    (approval) => approval.discordMessageId === discordMessageId
  );
}

export function updatePendingApproval(
  approvalId: string,
  updates: Partial<PendingApproval>
) {
  const approval = pendingApprovals.get(approvalId);

  if (!approval) {
    return undefined;
  }

  const nextApproval = { ...approval, ...updates };
  pendingApprovals.set(approvalId, nextApproval);
  return nextApproval;
}

export function deletePendingApproval(approvalId: string) {
  pendingApprovals.delete(approvalId);
}
