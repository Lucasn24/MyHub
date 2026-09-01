import { EventEmitter } from "node:events";
import { hasTokens } from "./google/tokenStore";
import { listUnreadMessages, markMessageAsRead } from "./google/gmail";
import { getKnownMessageIds, processEmail } from "./backend";

const SYNC_TIMEOUT_MS = 30_000;

declare global {
  // Survives Next.js dev-mode module hot-reload, unlike a plain module-scoped emitter.
  var __emailSyncEvents: EventEmitter | undefined;
  // Also globalThis-backed: a plain module-scoped mutex can get orphaned by a hot
  // reload mid-sync and stay stuck "true" forever, silently no-op'ing every future
  // sync (manual or polled) until the process restarts.
  var __emailSyncInProgress: boolean | undefined;
}

function isSyncing(): boolean {
  return globalThis.__emailSyncInProgress ?? false;
}

function setSyncing(value: boolean): void {
  globalThis.__emailSyncInProgress = value;
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms / 1000}s`)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

// Emits "new-emails" with the count of newly-processed messages whenever a sync
// cycle finds unread mail the backend didn't already know about. Route handlers
// (e.g. the SSE stream) subscribe to this to push a refresh signal to the client.
// Also emits "sync-status" whenever the sync outcome (ok/error) changes, so the
// UI can surface a failed sync (e.g. expired Google tokens) and offer a retry.
export const emailSyncEvents: EventEmitter = globalThis.__emailSyncEvents ?? new EventEmitter();
globalThis.__emailSyncEvents = emailSyncEvents;

export type SyncStatus = {
  state: "idle" | "error";
  error?: string;
  lastSyncedAt?: number;
  lastAttemptAt?: number;
};

declare global {
  var __emailSyncStatus: SyncStatus | undefined;
}

let syncStatus: SyncStatus = globalThis.__emailSyncStatus ?? { state: "idle" };
globalThis.__emailSyncStatus = syncStatus;

export function getSyncStatus(): SyncStatus {
  return syncStatus;
}

function setSyncStatus(next: SyncStatus): void {
  syncStatus = next;
  globalThis.__emailSyncStatus = next;
  emailSyncEvents.emit("sync-status", next);
}

async function runSyncCycle(): Promise<void> {
  const [known, unread] = await Promise.all([getKnownMessageIds(), listUnreadMessages(25)]);
  const newMessages = unread.filter((message) => !known.has(message.id));

  const results = await Promise.allSettled(
    newMessages.map((message) =>
      processEmail({
        id: message.id,
        subject: message.subject,
        sender: message.from,
        snippet: message.snippet,
        body: message.body,
        links: message.links,
        attachments: message.attachments.map((a) => ({ filename: a.filename, size: a.size })),
        received_at: message.receivedAt,
      })
    )
  );

  let processedCount = 0;
  for (const [i, result] of results.entries()) {
    const message = newMessages[i];
    if (result.status === "rejected") {
      console.error(`[email-sync] failed to process message ${message.id}:`, result.reason);
      continue;
    }
    processedCount += 1;

    // A receipt with expenses successfully pulled out of it needs no further
    // action from the user -- mark it read so it drops out of the unread/sync
    // pool. Keep the email row (and its expenses) intact; only tasks/meetings
    // get dismissed-and-deleted, via the manual mark-read flow.
    if (result.value.category === "receipt" && result.value.expenses.length > 0) {
      try {
        await markMessageAsRead(message.id);
      } catch (err) {
        console.error(`[email-sync] failed to mark receipt ${message.id} as read:`, err);
      }
    }
  }

  if (processedCount > 0) {
    emailSyncEvents.emit("new-emails", { count: processedCount });
  }
}

export async function syncInbox(): Promise<void> {
  if (isSyncing()) return;
  setSyncing(true);
  try {
    if (!(await hasTokens())) return;

    // A hung network call (dropped connection, no response) would otherwise wedge
    // the mutex forever, silently no-op'ing every sync until the process restarts.
    await withTimeout(runSyncCycle(), SYNC_TIMEOUT_MS, "email sync");

    setSyncStatus({ state: "idle", lastSyncedAt: Date.now() });
  } catch (err) {
    console.error("[email-sync] sync cycle failed:", err);
    setSyncStatus({
      state: "error",
      error: err instanceof Error ? err.message : String(err),
      lastAttemptAt: Date.now(),
      lastSyncedAt: syncStatus.lastSyncedAt,
    });
  } finally {
    setSyncing(false);
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
