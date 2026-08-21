import { NextRequest, NextResponse } from "next/server";
import { confirmTask } from "@/lib/backend";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const updates = await request.json();
  await confirmTask(id, updates);
  return NextResponse.json({ ok: true });
}
