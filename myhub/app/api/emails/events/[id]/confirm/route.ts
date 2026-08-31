import { NextRequest, NextResponse } from "next/server";
import { confirmEvent } from "@/lib/backend";
import { requireSession } from "@/lib/auth/dal";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const updates = await request.json();
  await confirmEvent(id, updates);
  return NextResponse.json({ ok: true });
}
