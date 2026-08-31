import { NextRequest, NextResponse } from "next/server";
import { deletePlannerTask, updatePlannerTask } from "@/lib/backend";
import { requireSession } from "@/lib/auth/dal";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const updates = await request.json();
  const updated = await updatePlannerTask(id, updates);
  return NextResponse.json(updated);
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  await deletePlannerTask(id);
  return NextResponse.json({ ok: true });
}
