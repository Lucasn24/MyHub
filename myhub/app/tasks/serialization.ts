import type {
  PlannerBlockRow,
  PlannerGoalRow,
  PlannerTagRow,
  PlannerTaskRow,
} from "@/lib/backend";
import type { Goal, ScheduleBlock, Tag, Task } from "./types";

export function rowToTask(row: PlannerTaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    notes: row.notes ?? undefined,
    dueDate: row.due_date ?? undefined,
    dueTime: row.due_time ?? undefined,
    tagIds: row.tag_ids,
    goalId: row.goal_id ?? undefined,
    repeat: row.repeat ?? undefined,
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
    tag_ids: task.tagIds,
    goal_id: task.goalId ?? null,
    repeat: task.repeat ?? null,
    completed_dates: task.completedDates,
  };
}

export function taskUpdatesToRow(updates: Partial<Task>): Partial<Omit<PlannerTaskRow, "id" | "created_at">> {
  const row: Partial<Omit<PlannerTaskRow, "id" | "created_at">> = {};
  if ("title" in updates) row.title = updates.title;
  if ("notes" in updates) row.notes = updates.notes ?? null;
  if ("dueDate" in updates) row.due_date = updates.dueDate ?? null;
  if ("dueTime" in updates) row.due_time = updates.dueTime ?? null;
  if ("tagIds" in updates) row.tag_ids = updates.tagIds;
  if ("goalId" in updates) row.goal_id = updates.goalId ?? null;
  if ("repeat" in updates) row.repeat = updates.repeat ?? null;
  if ("completedDates" in updates) row.completed_dates = updates.completedDates;
  return row;
}

export function rowToBlock(row: PlannerBlockRow): ScheduleBlock {
  return {
    id: row.id,
    taskId: row.task_id ?? undefined,
    title: row.title,
    notes: row.notes ?? undefined,
    date: row.date,
    startTime: row.start_time,
    endTime: row.end_time,
    tagIds: row.tag_ids,
    goalId: row.goal_id ?? undefined,
    repeat: row.repeat ?? undefined,
    pushedToGoogle: row.pushed_to_google,
  };
}

export function blockToRow(block: ScheduleBlock): Omit<PlannerBlockRow, "created_at"> {
  return {
    id: block.id,
    task_id: block.taskId ?? null,
    title: block.title,
    notes: block.notes ?? null,
    date: block.date,
    start_time: block.startTime,
    end_time: block.endTime,
    tag_ids: block.tagIds,
    goal_id: block.goalId ?? null,
    repeat: block.repeat ?? null,
    pushed_to_google: block.pushedToGoogle,
  };
}

export function blockUpdatesToRow(
  updates: Partial<ScheduleBlock>
): Partial<Omit<PlannerBlockRow, "id" | "created_at">> {
  const row: Partial<Omit<PlannerBlockRow, "id" | "created_at">> = {};
  if ("taskId" in updates) row.task_id = updates.taskId ?? null;
  if ("title" in updates) row.title = updates.title;
  if ("notes" in updates) row.notes = updates.notes ?? null;
  if ("date" in updates) row.date = updates.date;
  if ("startTime" in updates) row.start_time = updates.startTime;
  if ("endTime" in updates) row.end_time = updates.endTime;
  if ("tagIds" in updates) row.tag_ids = updates.tagIds;
  if ("goalId" in updates) row.goal_id = updates.goalId ?? null;
  if ("repeat" in updates) row.repeat = updates.repeat ?? null;
  if ("pushedToGoogle" in updates) row.pushed_to_google = updates.pushedToGoogle;
  return row;
}

export function rowToTag(row: PlannerTagRow): Tag {
  return { id: row.id, label: row.label, color: row.color };
}

export function tagToRow(tag: Tag): Omit<PlannerTagRow, "created_at"> {
  return { id: tag.id, label: tag.label, color: tag.color };
}

export function rowToGoal(row: PlannerGoalRow): Goal {
  return { id: row.id, label: row.label, createdAt: row.created_at };
}

export function goalToRow(goal: Goal): Omit<PlannerGoalRow, "created_at"> {
  return { id: goal.id, label: goal.label };
}
