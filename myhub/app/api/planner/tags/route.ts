import { NextRequest, NextResponse } from "next/server";
import { createPlannerTag } from "@/lib/backend";

export async function POST(request: NextRequest) {
  const row = await request.json();
  const created = await createPlannerTag(row);
  return NextResponse.json(created);
}
