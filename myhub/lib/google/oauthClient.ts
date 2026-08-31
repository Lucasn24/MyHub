import { google } from "googleapis";
import { loadTokens, saveTokens } from "./tokenStore";

export const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/gmail.modify",
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/calendar",
];

export function getOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

export async function getAuthorizedClient() {
  const tokens = await loadTokens();
  if (!tokens) return null;

  const client = getOAuthClient();
  client.setCredentials(tokens);

  client.on("tokens", (newTokens) => {
    // Fire-and-forget -- this event callback can't be awaited.
    saveTokens({ ...tokens, ...newTokens }).catch((err) => {
      console.error("Failed to persist refreshed Google tokens:", err);
    });
  });

  return client;
}
