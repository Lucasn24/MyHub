import { NextRequest, NextResponse } from "next/server";
import { createPlannerTag } from "@/lib/backend";
import { requireSession } from "@/lib/auth/dal";

export async function POST(request: NextRequest) {
  if (!(await requireSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const row = await request.json();
  const created = await createPlannerTag(row);
  return NextResponse.json(created);
}
