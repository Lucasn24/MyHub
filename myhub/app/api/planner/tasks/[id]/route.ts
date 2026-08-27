import { NextRequest, NextResponse } from "next/server";
import { deletePlannerTask, updatePlannerTask } from "@/lib/backend";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const updates = await request.json();
  const updated = await updatePlannerTask(id, updates);
  return NextResponse.json(updated);
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await deletePlannerTask(id);
  return NextResponse.json({ ok: true });
}
