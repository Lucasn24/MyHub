import { NextRequest, NextResponse } from "next/server";
import { markMessageAsRead } from "@/lib/google/gmail";
import { deleteEmail } from "@/lib/backend";
import { requireSession } from "@/lib/auth/dal";

export async function POST(request: NextRequest) {
  if (!(await requireSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { gmail_message_ids } = (await request.json()) as { gmail_message_ids: string[] };

  const results = await Promise.all(
    gmail_message_ids.map(async (id) => {
      try {
        // Gmail first, then the DB row — if the DB delete fails after Gmail
        // succeeds, the message just gets skipped on the next sync (its id is
        // still known) rather than losing track of it entirely.
        await markMessageAsRead(id);
        await deleteEmail(id);
        return { id, ok: true as const };
      } catch (err) {
        return { id, ok: false as const, error: err instanceof Error ? err.message : "Unknown error" };
      }
    })
  );

  return NextResponse.json({ results });
}
