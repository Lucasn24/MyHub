import { NextRequest, NextResponse } from "next/server";
import { updateExpense } from "@/lib/backend";
import { requireSession } from "@/lib/auth/dal";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const updates = await request.json();
  const updated = await updateExpense(id, updates);
  return NextResponse.json(updated);
}
