import { NextRequest, NextResponse } from "next/server";
import { deletePlannerBlock, updatePlannerBlock } from "@/lib/backend";
import { deleteEvent } from "@/lib/google/calendar";
import { requireSession } from "@/lib/auth/dal";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const updates = await request.json();
  const updated = await updatePlannerBlock(id, updates);
  return NextResponse.json(updated);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { googleEventId } = (await request.json().catch(() => ({}))) as { googleEventId?: string };

  if (googleEventId) {
    try {
      await deleteEvent(googleEventId);
    } catch (err) {
      // Best-effort -- the event may already be gone on Google's side, or
      // Google may be disconnected. Either way, still delete the local block.
      console.error("Failed to delete Google Calendar event:", err);
    }
  }

  await deletePlannerBlock(id);
  return NextResponse.json({ ok: true });
}
