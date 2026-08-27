import { NextRequest, NextResponse } from "next/server";
import { createEvent } from "@/lib/google/calendar";
import { hasTokens } from "@/lib/google/tokenStore";
import { updatePlannerBlock } from "@/lib/backend";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { title, date, startTime, endTime } = (await request.json()) as {
    title: string;
    date: string;
    startTime: string;
    endTime: string;
  };

  if (!hasTokens()) {
    return NextResponse.json({ error: "Google is not connected" }, { status: 409 });
  }

  let googleEventId: string;
  try {
    googleEventId = await createEvent({
      summary: title,
      start: new Date(`${date}T${startTime}:00`).toISOString(),
      end: new Date(`${date}T${endTime}:00`).toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  const updated = await updatePlannerBlock(id, { pushed_to_google: true, google_event_id: googleEventId });
  return NextResponse.json(updated);
}
