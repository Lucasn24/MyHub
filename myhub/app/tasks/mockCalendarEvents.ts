import type { MockCalendarEvent } from "./types";

// Placeholder calendar data for the timetable. Read-only — nothing here calls
// the real Google Calendar integration (lib/google/calendar.ts) yet.
export const MOCK_CALENDAR_EVENTS: MockCalendarEvent[] = [
  { id: "mock-1", title: "Team standup", startTime: "09:00", endTime: "09:15" },
  { id: "mock-2", title: "1:1 with manager", startTime: "11:00", endTime: "11:30", location: "Meet" },
  { id: "mock-3", title: "Product review", startTime: "14:00", endTime: "15:00", location: "Room 4B" },
  { id: "mock-4", title: "Dentist appointment", startTime: "17:30", endTime: "18:15" },
];
