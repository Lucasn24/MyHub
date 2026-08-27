import { NextRequest, NextResponse } from "next/server";
import { createPlannerGoal } from "@/lib/backend";

export async function POST(request: NextRequest) {
  const row = await request.json();
  const created = await createPlannerGoal(row);
  return NextResponse.json(created);
}
