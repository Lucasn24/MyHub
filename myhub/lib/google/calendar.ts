import { google } from "googleapis";
import { getAuthorizedClient } from "./oauthClient";

export type EventSummary = {
  id: string;
  summary: string;
  start: string;
};

export async function listUpcomingEvents(maxResults = 5): Promise<EventSummary[]> {
  const client = getAuthorizedClient();
  if (!client) throw new Error("Google is not connected");

  const calendar = google.calendar({ version: "v3", auth: client });

  const { data } = await calendar.events.list({
    calendarId: "primary",
    timeMin: new Date().toISOString(),
    maxResults,
    singleEvents: true,
    orderBy: "startTime",
  });

  const events = data.items ?? [];

  return events.map((event) => ({
    id: event.id!,
    summary: event.summary ?? "(no title)",
    start: event.start?.dateTime ?? event.start?.date ?? "",
  }));
}

export async function createEvent({
  summary,
  start,
  end,
}: {
  summary: string;
  start: string;
  end: string;
}) {
  const client = getAuthorizedClient();
  if (!client) throw new Error("Google is not connected");

  const calendar = google.calendar({ version: "v3", auth: client });

  await calendar.events.insert({
    calendarId: "primary",
    requestBody: {
      summary,
      start: { dateTime: start },
      end: { dateTime: end },
    },
  });
}
