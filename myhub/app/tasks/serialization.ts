import type { PlannerBlockRow, PlannerTagRow, PlannerTaskRow } from "@/lib/backend";
import type { ScheduleBlock, Tag, Task } from "./types";

export function rowToTask(row: PlannerTaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    notes: row.notes ?? undefined,
    dueDate: row.due_date ?? undefined,
    dueTime: row.due_time ?? undefined,
    tagId: row.tag_id ?? undefined,
    eventId: row.event_id ?? undefined,
    completedDates: row.completed_dates,
    createdAt: row.created_at,
  };
}

export function taskToRow(task: Task): Omit<PlannerTaskRow, "created_at"> {
  return {
    id: task.id,
    title: task.title,
    notes: task.notes ?? null,
    due_date: task.dueDate ?? null,
    due_time: task.dueTime ?? null,
    tag_id: task.tagId ?? null,
    event_id: task.eventId ?? null,
    completed_dates: task.completedDates,
  };
}

export function taskUpdatesToRow(updates: Partial<Task>): Partial<Omit<PlannerTaskRow, "id" | "created_at">> {
  const row: Partial<Omit<PlannerTaskRow, "id" | "created_at">> = {};
  if ("title" in updates) row.title = updates.title;
  if ("notes" in updates) row.notes = updates.notes ?? null;
  if ("dueDate" in updates) row.due_date = updates.dueDate ?? null;
  if ("dueTime" in updates) row.due_time = updates.dueTime ?? null;
  if ("tagId" in updates) row.tag_id = updates.tagId ?? null;
  if ("eventId" in updates) row.event_id = updates.eventId ?? null;
  if ("completedDates" in updates) row.completed_dates = updates.completedDates;
  return row;
}

export function rowToBlock(row: PlannerBlockRow): ScheduleBlock {
  return {
    id: row.id,
    title: row.title,
    notes: row.notes ?? undefined,
    date: row.date,
    startTime: row.start_time,
    endTime: row.end_time,
    tagId: row.tag_id ?? undefined,
    repeat: row.repeat ?? undefined,
    pushedToGoogle: row.pushed_to_google,
    googleEventId: row.google_event_id ?? undefined,
  };
}

export function blockToRow(block: ScheduleBlock): Omit<PlannerBlockRow, "created_at"> {
  return {
    id: block.id,
    title: block.title,
    notes: block.notes ?? null,
    date: block.date,
    start_time: block.startTime,
    end_time: block.endTime,
    tag_id: block.tagId ?? null,
    repeat: block.repeat ?? null,
    pushed_to_google: block.pushedToGoogle,
    google_event_id: block.googleEventId ?? null,
  };
}

export function blockUpdatesToRow(
  updates: Partial<ScheduleBlock>
): Partial<Omit<PlannerBlockRow, "id" | "created_at">> {
  const row: Partial<Omit<PlannerBlockRow, "id" | "created_at">> = {};
  if ("title" in updates) row.title = updates.title;
  if ("notes" in updates) row.notes = updates.notes ?? null;
  if ("date" in updates) row.date = updates.date;
  if ("startTime" in updates) row.start_time = updates.startTime;
  if ("endTime" in updates) row.end_time = updates.endTime;
  if ("tagId" in updates) row.tag_id = updates.tagId ?? null;
  if ("repeat" in updates) row.repeat = updates.repeat ?? null;
  if ("pushedToGoogle" in updates) row.pushed_to_google = updates.pushedToGoogle;
  if ("googleEventId" in updates) row.google_event_id = updates.googleEventId ?? null;
  return row;
}

export function rowToTag(row: PlannerTagRow): Tag {
  return { id: row.id, label: row.label, createdAt: row.created_at };
}

export function tagToRow(tag: Tag): Omit<PlannerTagRow, "created_at"> {
  return { id: tag.id, label: tag.label };
}
