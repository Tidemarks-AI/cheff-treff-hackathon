import { getGmailClient, isGmailConfigured } from "./gmail.js";
import { processEmail } from "./agent-pipeline.js";
import { createChangeRequest } from "./change-requests.js";
import { broadcastSSE } from "./sse.js";
import { postChangeRequestToDiscord } from "./discord-change-requests.js";
import { updateChangeRequestDiscord } from "./change-requests.js";
import { getCompanyDB } from "./surrealdb.js";

const POLL_INTERVAL_MS = 3_000;
const processedMessageIds = new Set<string>();

let pollerInterval: ReturnType<typeof setInterval> | null = null;

export function startGmailPoller(): void {
  if (!isGmailConfigured()) {
    console.log("Gmail not configured — poller disabled. Set GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN to enable.");
    return;
  }

  console.log("Starting Gmail poller (every 3s)...");
  pollerInterval = setInterval(pollOnce, POLL_INTERVAL_MS);
}

export function stopGmailPoller(): void {
  if (pollerInterval) {
    clearInterval(pollerInterval);
    pollerInterval = null;
  }
}

async function pollOnce(): Promise<void> {
  try {
    const gmail = await getGmailClient();

    // List unread messages with attachments
    const listRes = await gmail.users.messages.list({
      userId: "me",
      q: "is:unread has:attachment newer_than:1h",
      maxResults: 5,
    });

    const messages = listRes.data.messages ?? [];

    for (const msg of messages) {
      if (processedMessageIds.has(msg.id!)) continue;
      processedMessageIds.add(msg.id!);

      try {
        await processMessage(gmail, msg.id!);
      } catch (error) {
        console.error(`Failed to process message ${msg.id}:`, error);
      }
    }
  } catch (error) {
    console.error("Gmail poll error:", error);
  }
}

async function processMessage(gmail: any, messageId: string): Promise<void> {
  // Fetch full message
  const msgRes = await gmail.users.messages.get({
    userId: "me",
    id: messageId,
    format: "full",
  });

  const headers = msgRes.data.payload?.headers ?? [];
  const from = headers.find((h: any) => h.name === "From")?.value ?? "unknown";
  const subject = headers.find((h: any) => h.name === "Subject")?.value ?? "no subject";

  // Find PDF attachment
  const parts = msgRes.data.payload?.parts ?? [];
  const pdfPart = parts.find(
    (p: any) => p.mimeType === "application/pdf" && p.body?.attachmentId
  );

  if (!pdfPart) {
    console.log(`Message ${messageId}: no PDF attachment, skipping`);
    return;
  }

  // Download attachment
  const attachRes = await gmail.users.messages.attachments.get({
    userId: "me",
    messageId,
    id: pdfPart.body.attachmentId,
  });

  const pdfBuffer = Buffer.from(attachRes.data.data, "base64url");

  // Mark as read
  await gmail.users.messages.modify({
    userId: "me",
    id: messageId,
    requestBody: { removeLabelIds: ["UNREAD"] },
  });

  console.log(`Processing email from ${from}: "${subject}" (attachment: ${pdfPart.filename})`);

  // Run agent pipeline
  const draft = await processEmail(pdfBuffer, {
    from,
    subject,
    attachmentFilename: pdfPart.filename ?? "attachment.pdf",
    gmailMessageId: messageId,
    mailbox: process.env.GMAIL_AGENT_ADDRESS || "agent@acme.com",
  });

  if (!draft) {
    console.warn(`Pipeline returned null for message ${messageId}`);
    return;
  }

  // Store in SurrealDB
  const surrealDbName = process.env.DEFAULT_SURREAL_DB || "acme_startup_gmbh";
  const db = await getCompanyDB(surrealDbName);
  try {
    const cr = await createChangeRequest(db, draft);
    broadcastSSE("change:new", cr);

    // Post to Discord
    const discord = await postChangeRequestToDiscord(cr).catch(() => undefined);
    if (discord) {
      await updateChangeRequestDiscord(
        db,
        String(cr.id).replace("change_request:", ""),
        discord.discordMessageId,
        discord.discordChannelId
      );
    }

    console.log(`Change request created: ${cr.id}`);
  } finally {
    await db.close();
  }
}
