import TasksBoard from "./TasksBoard";
import { rowToBlock, rowToTag, rowToTask } from "./serialization";
import { GRID_END_HOUR, GRID_START_HOUR, minutesToTime, toISODate } from "./time";
import { getPlannerState } from "@/lib/backend";
import { listEventsForDate } from "@/lib/google/calendar";
import { hasTokens } from "@/lib/google/tokenStore";
import type { CalendarEvent, ScheduleBlock, Tag, Task } from "./types";

async function loadPlannerState(): Promise<{
  tasks: Task[];
  blocks: ScheduleBlock[];
  tags: Tag[];
}> {
  try {
    const state = await getPlannerState();
    return {
      tasks: state.tasks.map(rowToTask),
      blocks: state.blocks.map(rowToBlock),
      tags: state.tags.map(rowToTag),
    };
  } catch (err) {
    console.error("Failed to load planner state from backend:", err);
    return { tasks: [], blocks: [], tags: [] };
  }
}

async function loadCalendarEvents(dateISO: string): Promise<CalendarEvent[]> {
  if (!hasTokens()) return [];
  try {
    const events = await listEventsForDate(dateISO);
    const gridStartMin = GRID_START_HOUR * 60;
    const gridEndMin = GRID_END_HOUR * 60;

    return events
      .map((ev): CalendarEvent | null => {
        const start = Math.max(gridStartMin, ev.startMinutes);
        const end = Math.min(gridEndMin, ev.endMinutes);
        if (end <= start) return null;
        return {
          id: ev.id,
          title: ev.title,
          location: ev.location,
          startTime: minutesToTime(start),
          endTime: minutesToTime(end),
        };
      })
      .filter((ev): ev is CalendarEvent => ev !== null);
  } catch (err) {
    console.error("Failed to load Google Calendar events:", err);
    return [];
  }
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export default async function TasksPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const { date } = await searchParams;
  const selectedDate = date && ISO_DATE_RE.test(date) ? date : toISODate(new Date());

  const [{ tasks, blocks, tags }, calendarEventsRaw] = await Promise.all([
    loadPlannerState(),
    loadCalendarEvents(selectedDate),
  ]);

  // Blocks pushed to Google Calendar come back through the sync above too --
  // skip re-rendering them a second time as a plain read-only overlay.
  const pushedGoogleEventIds = new Set(
    blocks.filter((b) => b.date === selectedDate && b.googleEventId).map((b) => b.googleEventId)
  );
  const calendarEvents = calendarEventsRaw.filter((ev) => !pushedGoogleEventIds.has(ev.id));

  return (
    <TasksBoard
      initialTasks={tasks}
      initialBlocks={blocks}
      initialTags={tags}
      calendarEvents={calendarEvents}
      selectedDate={selectedDate}
    />
  );
}
