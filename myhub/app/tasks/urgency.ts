import type { Task, Urgency } from "./types";
import { toISODate } from "./time";

export const URGENCY_ORDER: Urgency[] = ["overdue", "dueToday", "dueSoon", "upcoming", "none"];

export const URGENCY_LABEL: Record<Urgency, string> = {
  overdue: "Overdue",
  dueToday: "Due today",
  dueSoon: "Due soon",
  upcoming: "Upcoming",
  none: "No due date",
};

export const URGENCY_COLOR: Record<Urgency, string> = {
  overdue: "#d6453f",
  dueToday: "#e08a2c",
  dueSoon: "#c9a227",
  upcoming: "#4f8a5b",
  none: "#a3a39d",
};

export function getUrgency(task: Task, today: Date = new Date()): Urgency {
  if (!task.dueDate) return "none";

  const todayISO = toISODate(today);
  if (task.dueDate < todayISO) return "overdue";
  if (task.dueDate === todayISO) return "dueToday";

  const dueMs = new Date(`${task.dueDate}T00:00:00`).getTime();
  const todayMs = new Date(`${todayISO}T00:00:00`).getTime();
  const diffDays = (dueMs - todayMs) / (1000 * 60 * 60 * 24);

  return diffDays <= 2 ? "dueSoon" : "upcoming";
}
