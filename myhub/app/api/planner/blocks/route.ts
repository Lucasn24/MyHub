import { NextRequest, NextResponse } from "next/server";
import { createPlannerBlock } from "@/lib/backend";

export async function POST(request: NextRequest) {
  const row = await request.json();
  const created = await createPlannerBlock(row);
  return NextResponse.json(created);
}
