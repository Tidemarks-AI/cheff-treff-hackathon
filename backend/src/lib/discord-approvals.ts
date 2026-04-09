import { verifyKey } from "discord-interactions";
import type { PendingApproval } from "./approvals.js";

const DISCORD_API = "https://discord.com/api/v10";

const token = process.env.DISCORD_BOT_TOKEN;
const channelId = process.env.DISCORD_APPROVAL_CHANNEL_ID;
const publicKey = process.env.DISCORD_PUBLIC_KEY;
const applicationId = process.env.DISCORD_APPLICATION_ID;
const enabled = Boolean(token && channelId);

// Discord interaction types
const INTERACTION_TYPE_PING = 1;
const INTERACTION_TYPE_MESSAGE_COMPONENT = 3;

// Discord interaction response types
const RESPONSE_TYPE_PONG = 1;
const RESPONSE_TYPE_DEFERRED_UPDATE_MESSAGE = 6;

// Discord component types & styles
const COMPONENT_TYPE_ACTION_ROW = 1;
const COMPONENT_TYPE_BUTTON = 2;
const BUTTON_STYLE_SUCCESS = 3;
const BUTTON_STYLE_DANGER = 4;

type ApprovalDecisionHandler = (
  approvalId: string,
  decision: "allow" | "deny",
  source: string
) => Promise<unknown>;

let approvalDecisionHandler: ApprovalDecisionHandler | null = null;
let changeRequestDecisionHandler: ApprovalDecisionHandler | null = null;

export function setApprovalDecisionHandler(handler: ApprovalDecisionHandler) {
  approvalDecisionHandler = handler;
}

export function setChangeRequestDecisionHandler(handler: ApprovalDecisionHandler) {
  changeRequestDecisionHandler = handler;
}

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

export async function postApprovalToDiscord(approval: PendingApproval) {
  if (!enabled) {
    return undefined;
  }

  const res = await discordFetch(`/channels/${channelId}/messages`, {
    method: "POST",
    body: JSON.stringify({
      content: [
        "**Approval requested**",
        `**Agent:** ${approval.agentId}`,
        `**Function:** ${approval.toolName}`,
        `**Description:** ${approval.description}`,
        "**Parameters:**",
        "```json",
        JSON.stringify(approval.parameters, null, 2),
        "```",
      ].join("\n"),
      components: [
        {
          type: COMPONENT_TYPE_ACTION_ROW,
          components: [
            {
              type: COMPONENT_TYPE_BUTTON,
              style: BUTTON_STYLE_SUCCESS,
              label: "Allow",
              custom_id: `approval_allow:${approval.id}`,
            },
            {
              type: COMPONENT_TYPE_BUTTON,
              style: BUTTON_STYLE_DANGER,
              label: "Deny",
              custom_id: `approval_deny:${approval.id}`,
            },
          ],
        },
      ],
    }),
  });

  if (!res) {
    return undefined;
  }

  const message = (await res.json()) as {
    id: string;
    channel_id: string;
    guild_id?: string;
  };

  return {
    discordMessageId: message.id,
    discordChannelId: message.channel_id,
    discordGuildId: message.guild_id,
  };
}

export async function markDiscordApprovalResolved(
  approval: PendingApproval,
  decision: "allow" | "deny",
  source: string
) {
  if (!approval.discordChannelId || !approval.discordMessageId) {
    return;
  }

  const label = decision === "allow" ? "Allowed" : "Denied";

  // Edit the original message to disable buttons and show result
  await discordFetch(
    `/channels/${approval.discordChannelId}/messages/${approval.discordMessageId}`,
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
                custom_id: `resolved:${approval.id}`,
                disabled: true,
              },
            ],
          },
        ],
      }),
    }
  );
}

export async function handleDiscordInteraction(req: any, res: any) {
  if (!publicKey) {
    res.status(500).json({ error: "DISCORD_PUBLIC_KEY not configured" });
    return;
  }

  // Verify the request signature
  const signature = req.headers["x-signature-ed25519"] as string;
  const timestamp = req.headers["x-signature-timestamp"] as string;
  const rawBody = req.body;

  const isValid = await verifyKey(rawBody, signature, timestamp, publicKey);

  if (!isValid) {
    res.status(401).json({ error: "Invalid request signature" });
    return;
  }

  const interaction = JSON.parse(rawBody.toString());

  // Handle PING (Discord endpoint verification)
  if (interaction.type === INTERACTION_TYPE_PING) {
    res.json({ type: RESPONSE_TYPE_PONG });
    return;
  }

  // Handle button clicks
  if (interaction.type === INTERACTION_TYPE_MESSAGE_COMPONENT) {
    const customId = interaction.data?.custom_id as string;

    const userId = interaction.member?.user?.id ?? interaction.user?.id ?? "unknown";
    const source = `discord-button:${userId}`;

    // Handle change request buttons
    if (customId?.startsWith("change_")) {
      const [action, changeId] = customId.split(/:(.+)/);
      const decision = action === "change_allow" ? "allow" : "deny";

      let resolveError: string | null = null;
      if (changeRequestDecisionHandler) {
        try {
          await changeRequestDecisionHandler(changeId, decision, source);
        } catch (error) {
          resolveError = (error as Error).message;
          console.warn(`Failed to resolve change request ${changeId}: ${resolveError}`);
        }
      }

      const label = decision === "allow" ? "Approved" : "Rejected";
      res.json({
        type: 7,
        data: {
          content: resolveError
            ? `Failed to resolve change request: ${resolveError}`
            : `Change request **${label}** by <@${userId}>.`,
          components: [],
        },
      });
      return;
    }

    // Handle approval buttons
    if (!customId?.startsWith("approval_")) {
      res.json({ type: RESPONSE_TYPE_DEFERRED_UPDATE_MESSAGE });
      return;
    }

    const [action, approvalId] = customId.split(/:(.+)/);
    const approvalDecision = action === "approval_allow" ? "allow" : "deny";

    // Resolve the approval BEFORE responding (Vercel kills the function after res.json)
    let resolveError: string | null = null;
    if (approvalDecisionHandler) {
      try {
        await approvalDecisionHandler(approvalId, approvalDecision, source);
      } catch (error) {
        resolveError = (error as Error).message;
        console.warn(
          `Failed to resolve approval ${approvalId}: ${resolveError}`
        );
      }
    }

    const label = approvalDecision === "allow" ? "Allowed" : "Denied";

    // Respond with an updated message (buttons replaced with result)
    res.json({
      type: 7, // UPDATE_MESSAGE
      data: {
        content: resolveError
          ? `Failed to resolve approval: ${resolveError}`
          : `Approval **${label}** by <@${userId}>.`,
        components: [],
      },
    });

    return;
  }

  res.json({ type: RESPONSE_TYPE_PONG });
}
