import { NextRequest, NextResponse } from "next/server";
import { deletePlannerTag, updatePlannerTag } from "@/lib/backend";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const updates = await request.json();
  const updated = await updatePlannerTag(id, updates);
  return NextResponse.json(updated);
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await deletePlannerTag(id);
  return NextResponse.json({ ok: true });
}
