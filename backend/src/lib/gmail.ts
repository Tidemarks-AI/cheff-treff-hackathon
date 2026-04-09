/**
 * Gmail API client for the agent's email inbox.
 *
 * Requires env vars: GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN
 * One-time setup: run the OAuth flow via GET /api/auth/gmail to obtain the refresh token.
 */

let gmail: any = null;

export function isGmailConfigured(): boolean {
  return Boolean(
    process.env.GMAIL_CLIENT_ID &&
    process.env.GMAIL_CLIENT_SECRET &&
    process.env.GMAIL_REFRESH_TOKEN
  );
}

export async function getGmailClient() {
  if (gmail) return gmail;

  // Dynamic import to avoid requiring googleapis when not configured
  const { google } = await import("googleapis");

  const oauth2Client = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
    process.env.GMAIL_REDIRECT_URI || "http://localhost:3001/api/auth/gmail/callback"
  );

  oauth2Client.setCredentials({
    refresh_token: process.env.GMAIL_REFRESH_TOKEN,
  });

  gmail = (google as any).gmail({ version: "v1", auth: oauth2Client });
  return gmail;
}

/**
 * Get the OAuth2 client for the auth flow endpoints.
 */
export async function getOAuth2Client() {
  const { google } = await import("googleapis");

  return new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
    process.env.GMAIL_REDIRECT_URI || "http://localhost:3001/api/auth/gmail/callback"
  );
}
