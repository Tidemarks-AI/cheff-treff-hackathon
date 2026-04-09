import type { ChangeRequest } from "./change-requests.js";

const DISCORD_API = "https://discord.com/api/v10";

const token = process.env.DISCORD_BOT_TOKEN;
const channelId = process.env.DISCORD_APPROVAL_CHANNEL_ID;
const enabled = Boolean(token && channelId);

const COMPONENT_TYPE_ACTION_ROW = 1;
const COMPONENT_TYPE_BUTTON = 2;
const BUTTON_STYLE_SUCCESS = 3;
const BUTTON_STYLE_DANGER = 4;

async function discordFetch(path: string, options: RequestInit = {}) {
  const res = await fetch(`${DISCORD_API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bot ${token}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    console.warn(`Discord API error ${res.status} ${path}: ${text}`);
    return null;
  }

  return res;
}

export async function postChangeRequestToDiscord(cr: ChangeRequest) {
  if (!enabled) return undefined;

  const values = cr.proposal_values as Record<string, unknown>;
  const amount =
    typeof values.monthly_amount === "number"
      ? `€${values.monthly_amount.toLocaleString("de-DE")}/mo`
      : "unknown";

  const res = await discordFetch(`/channels/${channelId}/messages`, {
    method: "POST",
    body: JSON.stringify({
      content: [
        "**Change Request — Finance Approval Required**",
        "",
        `**Action:** ${cr.proposal_action} → ${cr.proposal_target_type}`,
        `**From:** ${cr.source_from}`,
        `**Subject:** ${cr.source_subject}`,
        `**Amount:** ${amount}`,
        `**Confidence:** ${(cr.reasoning_confidence * 100).toFixed(0)}%`,
        "",
        `> ${cr.reasoning_summary}`,
        "",
        cr.policy_satisfied
          ? "Policy: Satisfied"
          : `⚠️ **Policy:** ${cr.policy_message}`,
      ].join("\n"),
      components: [
        {
          type: COMPONENT_TYPE_ACTION_ROW,
          components: [
            {
              type: COMPONENT_TYPE_BUTTON,
              style: BUTTON_STYLE_SUCCESS,
              label: "Approve",
              custom_id: `change_allow:${cr.id}`,
            },
            {
              type: COMPONENT_TYPE_BUTTON,
              style: BUTTON_STYLE_DANGER,
              label: "Reject",
              custom_id: `change_deny:${cr.id}`,
            },
          ],
        },
      ],
    }),
  });

  if (!res) return undefined;

  const message = (await res.json()) as {
    id: string;
    channel_id: string;
  };

  return {
    discordMessageId: message.id,
    discordChannelId: message.channel_id,
  };
}

export async function markChangeRequestDiscordResolved(
  cr: ChangeRequest,
  decision: "allow" | "deny",
  source: string
) {
  if (!cr.discord_channel_id || !cr.discord_message_id) return;

  const label = decision === "allow" ? "Approved" : "Rejected";

  await discordFetch(
    `/channels/${cr.discord_channel_id}/messages/${cr.discord_message_id}`,
    {
      method: "PATCH",
      body: JSON.stringify({
        components: [
          {
            type: COMPONENT_TYPE_ACTION_ROW,
            components: [
              {
                type: COMPONENT_TYPE_BUTTON,
                style:
                  decision === "allow"
                    ? BUTTON_STYLE_SUCCESS
                    : BUTTON_STYLE_DANGER,
                label: `${label} via ${source}`,
                custom_id: `resolved:${cr.id}`,
                disabled: true,
              },
            ],
          },
        ],
      }),
    }
  );
}
