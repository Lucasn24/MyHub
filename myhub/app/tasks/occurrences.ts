import type { ScheduleBlock } from "./types";

export const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Whether a (possibly recurring) block should render on the given day —
// always true on its own literal date; for any other day, only true if a
// repeat rule is set and that day matches the pattern. There's only ever one
// underlying row, so every occurrence shares the same time/tag/title — and
// editing, moving, resizing, or deleting from any occurrence affects all of
// them, same as the block's own literal date.
export function blockOccursOn(block: ScheduleBlock, dateISO: string): boolean {
  if (block.date === dateISO) return true;
  if (!block.repeat) return false;
  if (dateISO < block.date) return false; // never project backward before the first occurrence
  if (block.repeat.endDate && dateISO > block.repeat.endDate) return false;
  if (block.repeat.freq === "daily") return true;
  const day = new Date(`${dateISO}T00:00:00`).getDay();
  return block.repeat.daysOfWeek?.includes(day) ?? false;
}
