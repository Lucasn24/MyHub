import { NextRequest, NextResponse } from "next/server";
import { createPlannerTask } from "@/lib/backend";

export async function POST(request: NextRequest) {
  const row = await request.json();
  const created = await createPlannerTask(row);
  return NextResponse.json(created);
}
