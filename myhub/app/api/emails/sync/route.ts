import { NextResponse } from "next/server";
import { syncInbox, getSyncStatus } from "@/lib/emailSync";
import { requireSession } from "@/lib/auth/dal";

// Runs on Node so it shares the same syncing/status state as the background poller.
export const runtime = "nodejs";

export async function POST() {
  if (!(await requireSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await syncInbox();
  return NextResponse.json(getSyncStatus());
}
