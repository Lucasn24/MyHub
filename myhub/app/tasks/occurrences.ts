import type { RepeatRule } from "./types";

// A one-off task (no repeat rule) is always considered "active" for today.
// A recurring task is only active on dates its rule matches.
export function occursOn(repeat: RepeatRule | undefined, dateISO: string): boolean {
  if (!repeat) return true;
  if (repeat.endDate && dateISO > repeat.endDate) return false;
  if (repeat.freq === "daily") return true;

  const day = new Date(`${dateISO}T00:00:00`).getDay();
  return repeat.daysOfWeek?.includes(day) ?? false;
}

export const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
