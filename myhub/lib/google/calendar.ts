import { google } from "googleapis";
import { getAuthorizedClient } from "./oauthClient";

// Defaults to the account's main calendar; set GOOGLE_CALENDAR_ID (see
// .env_sample) to sync a different one instead.
function getCalendarId(): string {
  return process.env.GOOGLE_CALENDAR_ID?.trim() || "primary";
}

export type EventSummary = {
  id: string;
  summary: string;
  start: string;
};

export type DayCalendarEvent = {
  id: string;
  title: string;
  location?: string;
  // Minutes since local midnight of the requested date. Can be negative or
  // >= 1440 for events that span past that day's boundary (e.g. an overnight
  // event) -- callers clamp to whatever day-view range they render.
  startMinutes: number;
  endMinutes: number;
};

export async function listEventsForDate(dateISO: string): Promise<DayCalendarEvent[]> {
  const client = await getAuthorizedClient();
  if (!client) throw new Error("Google is not connected");

  const calendar = google.calendar({ version: "v3", auth: client });
  const dayStart = new Date(`${dateISO}T00:00:00`);
  const dayEnd = new Date(`${dateISO}T23:59:59`);

  const { data } = await calendar.events.list({
    calendarId: getCalendarId(),
    timeMin: dayStart.toISOString(),
    timeMax: dayEnd.toISOString(),
    singleEvents: true,
    orderBy: "startTime",
  });

  const dayStartMs = dayStart.getTime();

  return (data.items ?? [])
    .filter((event) => event.start?.dateTime && event.end?.dateTime) // skip all-day (date-only) events
    .map((event) => ({
      id: event.id!,
      title: event.summary ?? "(no title)",
      location: event.location ?? undefined,
      startMinutes: Math.round((new Date(event.start!.dateTime!).getTime() - dayStartMs) / 60000),
      endMinutes: Math.round((new Date(event.end!.dateTime!).getTime() - dayStartMs) / 60000),
    }));
}

export async function listUpcomingEvents(maxResults = 5): Promise<EventSummary[]> {
  const client = await getAuthorizedClient();
  if (!client) throw new Error("Google is not connected");

  const calendar = google.calendar({ version: "v3", auth: client });

  const { data } = await calendar.events.list({
    calendarId: getCalendarId(),
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
}): Promise<string> {
  const client = await getAuthorizedClient();
  if (!client) throw new Error("Google is not connected");

  const calendar = google.calendar({ version: "v3", auth: client });

  const { data } = await calendar.events.insert({
    calendarId: getCalendarId(),
    requestBody: {
      summary,
      start: { dateTime: start },
      end: { dateTime: end },
    },
  });

  return data.id!;
}

export async function deleteEvent(eventId: string): Promise<void> {
  const client = await getAuthorizedClient();
  if (!client) throw new Error("Google is not connected");

  const calendar = google.calendar({ version: "v3", auth: client });

  await calendar.events.delete({ calendarId: getCalendarId(), eventId });
}
