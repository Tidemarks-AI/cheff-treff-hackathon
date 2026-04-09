import type { RunResult, RunToolApprovalItem } from "@openai/agents";
import type { Agent } from "@openai/agents";
import { getToolDefinition, type ToolName } from "../../tools.js";
import { getSupabase } from "./supabase.js";

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

type ApprovalRow = {
  id: string;
  agent_id: string;
  tool_name: string;
  parameters: unknown;
  description: string;
  call_id: string;
  run_state: string;
  discord_message_id: string | null;
  discord_channel_id: string | null;
  discord_guild_id: string | null;
  status: string;
  created_at: string;
};

function rowToApproval(row: ApprovalRow): PendingApproval {
  return {
    id: row.id,
    agentId: row.agent_id,
    toolName: row.tool_name,
    parameters: row.parameters,
    description: row.description,
    createdAt: row.created_at,
    callId: row.call_id,
    runState: row.run_state,
    discordMessageId: row.discord_message_id ?? undefined,
    discordChannelId: row.discord_channel_id ?? undefined,
    discordGuildId: row.discord_guild_id ?? undefined,
  };
}

function parseToolParameters(argumentsJson: string) {
  try {
    return JSON.parse(argumentsJson);
  } catch {
    return argumentsJson;
  }
}

function toInsertRow(
  agentId: string,
  runState: string,
  interruption: RunToolApprovalItem
): Record<string, unknown> | null {
  if (interruption.rawItem.type !== "function_call") {
    return null;
  }

  const toolName = interruption.rawItem.name as ToolName;
  const toolDefinition = getToolDefinition(toolName);

  return {
    agent_id: agentId,
    tool_name: toolName,
    parameters: parseToolParameters(interruption.rawItem.arguments),
    description:
      toolDefinition?.approvalDescription ??
      toolDefinition?.tool.description ??
      toolName,
    call_id: interruption.rawItem.callId,
    run_state: runState,
  };
}

export async function createPendingApprovals<TContext>(
  agentId: string,
  result: RunResult<TContext, Agent<TContext, any>>
) {
  const runState = result.state.toString();
  const rows = result.interruptions
    .map((interruption) => toInsertRow(agentId, runState, interruption))
    .filter((row): row is Record<string, unknown> => row !== null);

  if (rows.length === 0) {
    return [];
  }

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("pending_approvals")
    .insert(rows)
    .select();

  if (error) {
    throw new Error(`Failed to create approvals: ${error.message}`);
  }

  return (data as ApprovalRow[]).map(rowToApproval);
}

export async function listPendingApprovals() {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("pending_approvals")
    .select()
    .eq("status", "pending")
    .order("created_at");

  if (error) {
    throw new Error(`Failed to list approvals: ${error.message}`);
  }

  return (data as ApprovalRow[]).map(rowToApproval);
}

export async function getPendingApproval(approvalId: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("pending_approvals")
    .select()
    .eq("id", approvalId)
    .eq("status", "pending")
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to get approval: ${error.message}`);
  }

  return data ? rowToApproval(data as ApprovalRow) : undefined;
}

export async function getPendingApprovalByDiscordMessageId(
  discordMessageId: string
) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("pending_approvals")
    .select()
    .eq("discord_message_id", discordMessageId)
    .eq("status", "pending")
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to get approval by Discord message: ${error.message}`);
  }

  return data ? rowToApproval(data as ApprovalRow) : undefined;
}

export async function updatePendingApproval(
  approvalId: string,
  updates: Partial<PendingApproval>
) {
  const supabase = getSupabase();

  const dbUpdates: Record<string, unknown> = {};
  if (updates.discordMessageId !== undefined)
    dbUpdates.discord_message_id = updates.discordMessageId;
  if (updates.discordChannelId !== undefined)
    dbUpdates.discord_channel_id = updates.discordChannelId;
  if (updates.discordGuildId !== undefined)
    dbUpdates.discord_guild_id = updates.discordGuildId;

  const { data, error } = await supabase
    .from("pending_approvals")
    .update(dbUpdates)
    .eq("id", approvalId)
    .select()
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to update approval: ${error.message}`);
  }

  return data ? rowToApproval(data as ApprovalRow) : undefined;
}

export async function deletePendingApproval(
  approvalId: string,
  decision: "allowed" | "denied" = "allowed",
  resolvedBy?: string
) {
  const supabase = getSupabase();
  const { error } = await supabase
    .from("pending_approvals")
    .update({
      status: decision,
      resolved_by: resolvedBy,
      resolved_at: new Date().toISOString(),
    })
    .eq("id", approvalId)
    .eq("status", "pending");

  if (error) {
    throw new Error(`Failed to resolve approval: ${error.message}`);
  }
}
