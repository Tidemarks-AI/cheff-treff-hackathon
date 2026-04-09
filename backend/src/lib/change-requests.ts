import type { Surreal } from "surrealdb";

export type ForecastSeries = {
  months: string[];
  values: number[];
};

export type ChangeRequest = {
  id: string;
  status: "pending" | "approved" | "rejected";
  received_at: string;
  source_channel: string;
  source_mailbox: string | null;
  source_from: string;
  source_subject: string;
  source_attachment: string | null;
  source_gmail_id: string | null;
  proposal_action: "create_node" | "update_node";
  proposal_target_type: string;
  proposal_values: Record<string, unknown>;
  proposal_edges: Array<{ from: string; to: string; label: string }>;
  reasoning_summary: string;
  reasoning_confidence: number;
  reasoning_evidence: Array<{ field: string; clause: string; text: string }>;
  policy_triggered: string[];
  policy_satisfied: boolean;
  policy_message: string | null;
  impact_monthly_burn_delta: number;
  impact_annual_cost_delta: number;
  impact_runway_months_delta: number;
  impact_forecast_after: ForecastSeries | null;
  discord_message_id: string | null;
  discord_channel_id: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ChangeRequestDraft = Omit<
  ChangeRequest,
  "id" | "created_at" | "updated_at" | "resolved_by" | "resolved_at" | "discord_message_id" | "discord_channel_id"
>;

export async function listChangeRequests(db: Surreal): Promise<ChangeRequest[]> {
  const [result] = await db.query<[ChangeRequest[]]>(
    "SELECT * FROM change_request ORDER BY received_at DESC"
  );
  return result ?? [];
}

export async function getChangeRequest(
  db: Surreal,
  id: string
): Promise<ChangeRequest | undefined> {
  const [result] = await db.query<[ChangeRequest[]]>(
    "SELECT * FROM type::record($id)",
    { id }
  );
  return result?.[0];
}

export async function createChangeRequest(
  db: Surreal,
  draft: ChangeRequestDraft
): Promise<ChangeRequest> {
  const [result] = await db.query<[ChangeRequest[]]>(
    `CREATE change_request SET
      status = $status,
      received_at = $received_at,
      source_channel = $source_channel,
      source_mailbox = $source_mailbox,
      source_from = $source_from,
      source_subject = $source_subject,
      source_attachment = $source_attachment,
      source_gmail_id = $source_gmail_id,
      proposal_action = $proposal_action,
      proposal_target_type = $proposal_target_type,
      proposal_values = $proposal_values,
      proposal_edges = $proposal_edges,
      reasoning_summary = $reasoning_summary,
      reasoning_confidence = $reasoning_confidence,
      reasoning_evidence = $reasoning_evidence,
      policy_triggered = $policy_triggered,
      policy_satisfied = $policy_satisfied,
      policy_message = $policy_message,
      impact_monthly_burn_delta = $impact_monthly_burn_delta,
      impact_annual_cost_delta = $impact_annual_cost_delta,
      impact_runway_months_delta = $impact_runway_months_delta,
      impact_forecast_after = $impact_forecast_after`,
    draft as unknown as Record<string, unknown>
  );
  return result![0];
}

export async function approveChangeRequest(
  db: Surreal,
  id: string,
  resolvedBy: string = "ui"
): Promise<ChangeRequest | undefined> {
  const [result] = await db.query<[ChangeRequest[]]>(
    `UPDATE type::record($id) SET
      status = "approved",
      resolved_by = $resolved_by,
      resolved_at = time::now()`,
    { id, resolved_by: resolvedBy }
  );
  return result?.[0];
}

export async function rejectChangeRequest(
  db: Surreal,
  id: string,
  resolvedBy: string = "ui"
): Promise<ChangeRequest | undefined> {
  const [result] = await db.query<[ChangeRequest[]]>(
    `UPDATE type::record($id) SET
      status = "rejected",
      resolved_by = $resolved_by,
      resolved_at = time::now()`,
    { id, resolved_by: resolvedBy }
  );
  return result?.[0];
}

export async function updateChangeRequestDiscord(
  db: Surreal,
  id: string,
  discordMessageId: string,
  discordChannelId: string
): Promise<void> {
  await db.query(
    `UPDATE type::record($id) SET
      discord_message_id = $discord_message_id,
      discord_channel_id = $discord_channel_id`,
    { id, discord_message_id: discordMessageId, discord_channel_id: discordChannelId }
  );
}

/**
 * Apply the proposal: create a fixed_expense record and relate it to the cost center.
 */
export async function applyChangeRequestProposal(
  db: Surreal,
  cr: ChangeRequest
): Promise<void> {
  if (cr.proposal_action !== "create_node" || cr.proposal_target_type !== "Costs") {
    return;
  }

  const values = cr.proposal_values;
  await db.query(
    `CREATE fixed_expense SET
      cost_center = cost_center:ga,
      name = $name,
      amount = $amount,
      currency = "EUR",
      start_date = $start_date,
      source_system = "change_request"`,
    {
      name: `${values.vendor} - Office Rent`,
      amount: values.monthly_amount,
      start_date: values.start_date ?? new Date().toISOString(),
    }
  );
}
