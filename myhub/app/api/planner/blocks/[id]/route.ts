import { NextRequest, NextResponse } from "next/server";
import { deletePlannerBlock, updatePlannerBlock } from "@/lib/backend";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const updates = await request.json();
  const updated = await updatePlannerBlock(id, updates);
  return NextResponse.json(updated);
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await deletePlannerBlock(id);
  return NextResponse.json({ ok: true });
}
