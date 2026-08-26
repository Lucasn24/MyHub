import { EventEmitter } from "node:events";
import { hasTokens } from "./google/tokenStore";
import { listUnreadMessages } from "./google/gmail";
import { getKnownMessageIds, processEmail } from "./backend";

let syncing = false;

declare global {
  // Survives Next.js dev-mode module hot-reload, unlike a plain module-scoped emitter.
  var __emailSyncEvents: EventEmitter | undefined;
}

// Emits "new-emails" with the count of newly-processed messages whenever a sync
// cycle finds unread mail the backend didn't already know about. Route handlers
// (e.g. the SSE stream) subscribe to this to push a refresh signal to the client.
export const emailSyncEvents: EventEmitter = globalThis.__emailSyncEvents ?? new EventEmitter();
globalThis.__emailSyncEvents = emailSyncEvents;

export async function syncInbox(): Promise<void> {
  if (syncing) return;
  syncing = true;
  try {
    if (!hasTokens()) return;

    const [known, unread] = await Promise.all([getKnownMessageIds(), listUnreadMessages(25)]);
    const newMessages = unread.filter((message) => !known.has(message.id));

    let processedCount = 0;
    for (const message of newMessages) {
      try {
        await processEmail({
          id: message.id,
          subject: message.subject,
          sender: message.from,
          snippet: message.snippet,
          body: message.body,
          links: message.links,
          attachments: message.attachments.map((a) => ({ filename: a.filename, size: a.size })),
          received_at: message.receivedAt,
        });
        processedCount += 1;
      } catch (err) {
        console.error(`[email-sync] failed to process message ${message.id}:`, err);
      }
    }

    if (processedCount > 0) {
      emailSyncEvents.emit("new-emails", { count: processedCount });
    }
  } catch (err) {
    console.error("[email-sync] sync cycle failed:", err);
  } finally {
    syncing = false;
  }
}

declare global {
  // Survives Next.js dev-mode module hot-reload, unlike a plain module-scoped flag.
  var __emailSyncPollerStarted: boolean | undefined;
}

export function startEmailSyncPoller(): void {
  if (globalThis.__emailSyncPollerStarted) return;
  globalThis.__emailSyncPollerStarted = true;

  const intervalMs = Number(process.env.EMAIL_SYNC_INTERVAL_MS) || 5 * 60 * 1000;

  void syncInbox();
  setInterval(() => void syncInbox(), intervalMs);
}
