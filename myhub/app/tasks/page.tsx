import TasksBoard from "./TasksBoard";
import { rowToBlock, rowToGoal, rowToTag, rowToTask } from "./serialization";
import { GRID_END_HOUR, GRID_START_HOUR, minutesToTime, toISODate } from "./time";
import { getPlannerState } from "@/lib/backend";
import { listEventsForDate } from "@/lib/google/calendar";
import { hasTokens } from "@/lib/google/tokenStore";
import type { CalendarEvent, Goal, ScheduleBlock, Tag, Task } from "./types";

async function loadPlannerState(): Promise<{
  tasks: Task[];
  blocks: ScheduleBlock[];
  tags: Tag[];
  goals: Goal[];
}> {
  try {
    const state = await getPlannerState();
    return {
      tasks: state.tasks.map(rowToTask),
      blocks: state.blocks.map(rowToBlock),
      tags: state.tags.map(rowToTag),
      goals: state.goals.map(rowToGoal),
    };
  } catch (err) {
    console.error("Failed to load planner state from backend:", err);
    return { tasks: [], blocks: [], tags: [], goals: [] };
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

export default async function TasksPage() {
  const todayISO = toISODate(new Date());
  const [{ tasks, blocks, tags, goals }, calendarEvents] = await Promise.all([
    loadPlannerState(),
    loadCalendarEvents(todayISO),
  ]);

  return (
    <TasksBoard
      initialTasks={tasks}
      initialBlocks={blocks}
      initialTags={tags}
      initialGoals={goals}
      calendarEvents={calendarEvents}
    />
  );
}
