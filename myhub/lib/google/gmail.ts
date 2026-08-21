import { google } from "googleapis";
import { getAuthorizedClient } from "./oauthClient";

export type EmailSummary = {
  id: string;
  subject: string;
  from: string;
  snippet: string;
};

export async function listRecentMessages(maxResults = 5): Promise<EmailSummary[]> {
  const client = getAuthorizedClient();
  if (!client) throw new Error("Google is not connected");

  const gmail = google.gmail({ version: "v1", auth: client });

  const { data } = await gmail.users.messages.list({
    userId: "me",
    maxResults,
  });

  const messages = data.messages ?? [];

  const details = await Promise.all(
    messages.map((message) =>
      gmail.users.messages.get({
        userId: "me",
        id: message.id!,
        format: "metadata",
        metadataHeaders: ["Subject", "From"],
      })
    )
  );

  return details.map(({ data }) => {
    const headers = data.payload?.headers ?? [];
    const subject = headers.find((h) => h.name === "Subject")?.value ?? "(no subject)";
    const from = headers.find((h) => h.name === "From")?.value ?? "(unknown sender)";
    return { id: data.id!, subject, from, snippet: data.snippet ?? "" };
  });
}

export async function sendMessage({
  to,
  subject,
  body,
}: {
  to: string;
  subject: string;
  body: string;
}) {
  const client = getAuthorizedClient();
  if (!client) throw new Error("Google is not connected");

  const gmail = google.gmail({ version: "v1", auth: client });

  const message = [`To: ${to}`, `Subject: ${subject}`, "Content-Type: text/plain; charset=utf-8", "", body].join(
    "\n"
  );

  const raw = Buffer.from(message).toString("base64url");

  await gmail.users.messages.send({
    userId: "me",
    requestBody: { raw },
  });
}
