import {
  ChannelType,
  Client,
  Events,
  GatewayIntentBits,
  Partials,
  type Message,
} from "discord.js";
import type { PendingApproval } from "./approvals.js";

type ApprovalDecisionHandler = (
  approvalId: string,
  decision: "allow" | "deny",
  source: string
) => Promise<void>;

const token = process.env.DISCORD_BOT_TOKEN;
const guildId = process.env.DISCORD_APPROVAL_GUILD_ID;
const channelId = process.env.DISCORD_APPROVAL_CHANNEL_ID;
const guildName = process.env.DISCORD_APPROVAL_GUILD_NAME || "lococo";
const channelName = process.env.DISCORD_APPROVAL_CHANNEL_NAME || "bot";
const enableMessageReplies = process.env.DISCORD_ENABLE_MESSAGE_CONTENT === "true";
const enabled = Boolean(token);

let clientPromise: Promise<Client<boolean> | null> | null = null;
let approvalDecisionHandler: ApprovalDecisionHandler | null = null;

function isAllowReaction(reaction: { emoji: { name: string | null } }) {
  return reaction.emoji.name === "✅" || reaction.emoji.name === "white_check_mark";
}

function isDenyReaction(reaction: { emoji: { name: string | null } }) {
  return reaction.emoji.name === "❌" || reaction.emoji.name === "x";
}

async function ensureClient() {
  if (!enabled) {
    return null;
  }

  if (!clientPromise) {
    clientPromise = (async () => {
      const client = new Client({
        intents: [
          GatewayIntentBits.Guilds,
          GatewayIntentBits.GuildMessages,
          GatewayIntentBits.GuildMessageReactions,
          ...(enableMessageReplies ? [GatewayIntentBits.MessageContent] : []),
        ],
        partials: [Partials.Channel, Partials.Message, Partials.Reaction],
      });

      client.on(Events.ClientReady, () => {
        console.log("Discord approval bot connected");
        console.log(
          `Discord bot user: ${client.user?.tag ?? "unknown"} (${client.user?.id ?? "unknown"})`
        );
        const visibleGuilds = client.guilds.cache.map(
          (guild) => `${guild.name} (${guild.id})`
        );
        console.log(
          `Discord bot guilds: ${visibleGuilds.length > 0 ? visibleGuilds.join(", ") : "none"}`
        );
      });

      client.on(Events.MessageReactionAdd, async (reaction, user) => {
        if (user.bot || !approvalDecisionHandler) {
          return;
        }

        if (reaction.partial) {
          await reaction.fetch();
        }

        const approvalId = reaction.message.id;

        if (isAllowReaction(reaction)) {
          await approvalDecisionHandler(approvalId, "allow", `discord-reaction:${user.id}`);
          return;
        }

        if (isDenyReaction(reaction)) {
          await approvalDecisionHandler(approvalId, "deny", `discord-reaction:${user.id}`);
        }
      });

      client.on(Events.MessageCreate, async (message) => {
        if (!enableMessageReplies) {
          return;
        }

        if (message.author.bot || !approvalDecisionHandler) {
          return;
        }

        const decision = message.content.trim().toLowerCase();

        if (decision !== "allow" && decision !== "deny") {
          return;
        }

        const referencedMessageId = message.reference?.messageId;

        if (!referencedMessageId) {
          return;
        }

        await approvalDecisionHandler(
          referencedMessageId,
          decision,
          `discord-message:${message.author.id}`
        );
      });

      try {
        await client.login(token);
        return client;
      } catch (error) {
        console.warn(
          `Discord approval bot disabled: ${(error as Error).message}`
        );
        clientPromise = null;
        return null;
      }
    })();
  }

  return clientPromise;
}

async function getApprovalChannel() {
  const client = await ensureClient();

  if (!client) {
    return null;
  }

  let guild = null;

  if (guildId) {
    guild = await client.guilds.fetch(guildId).catch((error) => {
      console.warn(
        `Discord guild fetch failed for '${guildId}': ${(error as Error).message}`
      );
      return null;
    });
  }

  if (!guild) {
    await client.guilds.fetch();
    guild = client.guilds.cache.find((entry) => entry.name === guildName) ?? null;
  }

  if (!guild) {
    console.warn(
      guildId
        ? `Discord guild '${guildId}' not found for approvals`
        : `Discord guild '${guildName}' not found for approvals`
    );
    const visibleGuilds = client.guilds.cache.map(
      (entry) => `${entry.name} (${entry.id})`
    );
    console.warn(
      `Discord bot can currently see: ${visibleGuilds.length > 0 ? visibleGuilds.join(", ") : "no guilds"}`
    );
    return null;
  }

  if (channelId) {
    const explicitChannel = await guild.channels.fetch(channelId).catch((error) => {
      console.warn(
        `Discord channel fetch failed for '${channelId}': ${(error as Error).message}`
      );
      return null;
    });

    if (explicitChannel && explicitChannel.type === ChannelType.GuildText) {
      return explicitChannel;
    }

    console.warn(
      `Discord text channel '${channelId}' not found in guild '${guild.name}'`
    );
    return null;
  }

  await guild.channels.fetch();

  const channel = guild.channels.cache.find(
    (entry) => entry.type === ChannelType.GuildText && entry.name === channelName
  );

  if (!channel || channel.type !== ChannelType.GuildText) {
    console.warn(
      `Discord text channel '${channelName}' not found in guild '${guildName}'`
    );
    return null;
  }

  return channel;
}

export async function initDiscordApprovalBot(handler: ApprovalDecisionHandler) {
  approvalDecisionHandler = handler;
  await ensureClient();
}

export async function postApprovalToDiscord(approval: PendingApproval) {
  const channel = await getApprovalChannel();

  if (!channel) {
    return undefined;
  }

  const message = await channel.send({
    content: [
      "Approval requested",
      `Agent: ${approval.agentId}`,
      `Function: ${approval.toolName}`,
      `Description: ${approval.description}`,
      "Parameters:",
      "```json",
      JSON.stringify(approval.parameters, null, 2),
      "```",
      enableMessageReplies
        ? 'React with ✅ to allow or ❌ to deny, or reply with "allow" or "deny".'
        : "React with ✅ to allow or ❌ to deny.",
    ].join("\n"),
  });

  await message.react("✅");
  await message.react("❌");

  return {
    discordMessageId: message.id,
    discordChannelId: message.channelId,
    discordGuildId: message.guildId ?? undefined,
  };
}

export async function markDiscordApprovalResolved(
  approval: PendingApproval,
  decision: "allow" | "deny",
  source: string
) {
  const client = await ensureClient();

  if (!client || !approval.discordChannelId || !approval.discordMessageId) {
    return;
  }

  const channel = await client.channels.fetch(approval.discordChannelId);

  if (!channel || channel.type !== ChannelType.GuildText) {
    return;
  }

  const message = (await channel.messages.fetch(approval.discordMessageId).catch(
    () => null
  )) as Message<boolean> | null;

  if (!message) {
    return;
  }

  await message.reply(
    `Approval ${decision === "allow" ? "granted" : "denied"} via ${source}.`
  );
}
