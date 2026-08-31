import { google, gmail_v1 } from "googleapis";
import { getAuthorizedClient } from "./oauthClient";

export type Attachment = {
  filename: string;
  mimeType: string;
  attachmentId: string;
  size: number;
};

export type EmailSummary = {
  id: string;
  subject: string;
  from: string;
  snippet: string;
  body: string;
  links: string[];
  attachments: Attachment[];
  receivedAt: string | null;
};

function decodeBase64Url(data: string): string {
  return Buffer.from(data, "base64url").toString("utf-8");
}

function htmlToText(html: string): string {
  return html
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, "")
    .replace(/<(br|\/p|\/div|\/tr)\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const URL_REGEX = /https?:\/\/[^\s"'<>)\]]+/g;

type ParsedContent = {
  body: string;
  links: string[];
  attachments: Attachment[];
};

// Gmail messages are either a single part or a MIME tree; walk it depth-first once,
// collecting the text body (preferring text/plain, falling back to text/html stripped
// of tags), any attachment parts, and any links found in the body along the way.
function parseMessageContent(part: gmail_v1.Schema$MessagePart | undefined): ParsedContent {
  const attachments: Attachment[] = [];
  let plainText: string | null = null;
  let htmlText: string | null = null;

  const visit = (node: gmail_v1.Schema$MessagePart) => {
    if (node.filename && node.body?.attachmentId) {
      attachments.push({
        filename: node.filename,
        mimeType: node.mimeType ?? "application/octet-stream",
        attachmentId: node.body.attachmentId,
        size: node.body.size ?? 0,
      });
    } else if (node.mimeType === "text/plain" && node.body?.data && plainText === null) {
      plainText = decodeBase64Url(node.body.data);
    } else if (node.mimeType === "text/html" && node.body?.data && htmlText === null) {
      htmlText = decodeBase64Url(node.body.data);
    }
    for (const child of node.parts ?? []) visit(child);
  };

  if (part) visit(part);

  const linkSet = new Set<string>();
  if (htmlText) {
    for (const match of (htmlText as string).matchAll(/href=["']([^"']+)["']/gi)) {
      if (/^https?:\/\//i.test(match[1])) linkSet.add(match[1]);
    }
  }
  const textForUrlScan = plainText ?? (htmlText ? htmlToText(htmlText) : "");
  for (const match of textForUrlScan.matchAll(URL_REGEX)) {
    linkSet.add(match[0].replace(/[.,]+$/, ""));
  }

  const body = plainText ?? (htmlText ? htmlToText(htmlText) : "");

  return { body, links: [...linkSet], attachments };
}

export async function listRecentMessages(maxResults = 5, query?: string): Promise<EmailSummary[]> {
  const client = await getAuthorizedClient();
  if (!client) throw new Error("Google is not connected");

  const gmail = google.gmail({ version: "v1", auth: client });

  const { data } = await gmail.users.messages.list({
    userId: "me",
    maxResults,
    q: query,
  });

  const messages = data.messages ?? [];

  const details = await Promise.all(
    messages.map((message) =>
      gmail.users.messages.get({
        userId: "me",
        id: message.id!,
        format: "full",
      })
    )
  );

  return details.map(({ data }) => {
    const headers = data.payload?.headers ?? [];
    const subject = headers.find((h) => h.name === "Subject")?.value ?? "(no subject)";
    const from = headers.find((h) => h.name === "From")?.value ?? "(unknown sender)";
    const { body, links, attachments } = parseMessageContent(data.payload);
    const receivedAt = data.internalDate ? new Date(Number(data.internalDate)).toISOString() : null;
    return { id: data.id!, subject, from, snippet: data.snippet ?? "", body, links, attachments, receivedAt };
  });
}

// Messages Gmail currently has flagged unread — the pool the sync poller processes.
export async function listUnreadMessages(maxResults = 25): Promise<EmailSummary[]> {
  return listRecentMessages(maxResults, "is:unread");
}

export async function markMessageAsRead(messageId: string): Promise<void> {
  const client = await getAuthorizedClient();
  if (!client) throw new Error("Google is not connected");

  const gmail = google.gmail({ version: "v1", auth: client });

  await gmail.users.messages.modify({
    userId: "me",
    id: messageId,
    requestBody: { removeLabelIds: ["UNREAD"] },
  });
}

// Fetches the raw bytes of one attachment on demand — not called eagerly by
// listRecentMessages, since downloading every attachment for every listed message
// would be slow and quota-heavy. Returns base64url-encoded data; decode with
// Buffer.from(data, "base64url") to get the file bytes.
export async function getAttachment(
  messageId: string,
  attachmentId: string
): Promise<{ data: string; size: number }> {
  const client = await getAuthorizedClient();
  if (!client) throw new Error("Google is not connected");

  const gmail = google.gmail({ version: "v1", auth: client });

  const { data } = await gmail.users.messages.attachments.get({
    userId: "me",
    messageId,
    id: attachmentId,
  });

  return { data: data.data ?? "", size: data.size ?? 0 };
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
  const client = await getAuthorizedClient();
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

export type SenderCluster = {
  sender: string;
  displayName: string;
  count: number;
  unsubscribeUrl: string | null;
  unsubscribeMailto: string | null;
  oneClick: boolean;
};

function parseFrom(headerValue: string): { email: string | null; displayName: string } {
  const match = headerValue.match(/^"?([^"<]*)"?\s*<?([^<>\s]+@[^<>\s]+)>?$/);
  if (!match) return { email: null, displayName: headerValue };
  return { email: match[2], displayName: match[1].trim() || match[2] };
}

function parseListUnsubscribe(headerValue: string | undefined) {
  if (!headerValue) return { url: null, mailto: null };
  const uris = [...headerValue.matchAll(/<([^>]+)>/g)].map((m) => m[1]);
  return {
    url: uris.find((u) => /^https?:/i.test(u)) ?? null,
    mailto: uris.find((u) => /^mailto:/i.test(u)) ?? null,
  };
}

function isOneClick(listUnsubscribePost: string | undefined, url: string | null) {
  return Boolean(url) && /List-Unsubscribe=One-Click/i.test(listUnsubscribePost ?? "");
}

export async function findUnsubscribeCandidates(maxResults = 50): Promise<SenderCluster[]> {
  const client = await getAuthorizedClient();
  if (!client) throw new Error("Google is not connected");

  const gmail = google.gmail({ version: "v1", auth: client });

  // Multiple labelIds on messages.list is an AND, not an OR — a message can't be both
  // CATEGORY_PROMOTIONS and CATEGORY_UPDATES at once, so that always returned zero
  // results. Gmail's search syntax supports OR directly.
  const { data } = await gmail.users.messages.list({
    userId: "me",
    maxResults,
    q: "category:promotions OR category:updates",
  });
  const messages = data.messages ?? [];

  // Chunked rather than one big Promise.all — many concurrent metadata .get() calls
  // (5 quota units each) can approach Gmail's 250 units/sec per-user quota.
  const details: gmail_v1.Schema$Message[] = [];
  const CHUNK = 15;
  for (let i = 0; i < messages.length; i += CHUNK) {
    const chunk = messages.slice(i, i + CHUNK);
    const results = await Promise.all(
      chunk.map((m) =>
        gmail.users.messages.get({
          userId: "me",
          id: m.id!,
          format: "metadata",
          metadataHeaders: ["From", "List-Unsubscribe", "List-Unsubscribe-Post"],
        })
      )
    );
    details.push(...results.map((r) => r.data));
  }

  const clusters = new Map<string, SenderCluster>();
  for (const msg of details) {
    const headers = msg.payload?.headers ?? [];
    const fromHeader = headers.find((h) => h.name === "From")?.value ?? "";
    const { email, displayName } = parseFrom(fromHeader);
    if (!email) continue;

    const key = email.toLowerCase();
    const { url, mailto } = parseListUnsubscribe(headers.find((h) => h.name === "List-Unsubscribe")?.value ?? undefined);
    const oneClick = isOneClick(headers.find((h) => h.name === "List-Unsubscribe-Post")?.value ?? undefined, url);

    const existing = clusters.get(key);
    if (existing) {
      existing.count += 1;
      existing.unsubscribeUrl ??= url;
      existing.unsubscribeMailto ??= mailto;
      existing.oneClick ||= oneClick;
    } else {
      clusters.set(key, { sender: email, displayName, count: 1, unsubscribeUrl: url, unsubscribeMailto: mailto, oneClick });
    }
  }

  return [...clusters.values()].sort((a, b) => b.count - a.count);
}
