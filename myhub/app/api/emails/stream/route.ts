import { emailSyncEvents, getSyncStatus, type SyncStatus } from "@/lib/emailSync";
import { requireSession } from "@/lib/auth/dal";

// Runs on Node so it can share the EventEmitter singleton the background sync
// poller (instrumentation.ts) publishes new-email events on.
export const runtime = "nodejs";

const HEARTBEAT_MS = 25_000;

export async function GET() {
  if (!(await requireSession())) {
    return new Response(null, { status: 401 });
  }

  const encoder = new TextEncoder();

  let cleanup: () => void = () => {};

  const stream = new ReadableStream({
    start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      const onNewEmails = (payload: { count: number }) => send("new-emails", payload);
      emailSyncEvents.on("new-emails", onNewEmails);

      const onSyncStatus = (status: SyncStatus) => send("sync-status", status);
      emailSyncEvents.on("sync-status", onSyncStatus);

      // Let a newly-opened tab know the current status right away, not just future changes.
      send("sync-status", getSyncStatus());

      // Keeps intermediary proxies/load balancers from timing out the idle connection.
      const heartbeat = setInterval(() => controller.enqueue(encoder.encode(": heartbeat\n\n")), HEARTBEAT_MS);

      cleanup = () => {
        clearInterval(heartbeat);
        emailSyncEvents.off("new-emails", onNewEmails);
        emailSyncEvents.off("sync-status", onSyncStatus);
      };
    },
    cancel() {
      cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
