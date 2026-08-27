"use client";

import { useState } from "react";
import type { CSSProperties } from "react";
import type { Goal, Task, Tag, Urgency } from "./types";
import { URGENCY_COLOR, URGENCY_LABEL, URGENCY_ORDER, getUrgency } from "./urgency";
import { getGoalColor } from "./constants";
import { formatTimeLabel } from "./time";
import styles from "./TodoList.module.css";

export const TASK_DRAG_MIME = "application/x-myhub-task-id";

const FILTERABLE: Urgency[] = ["overdue", "dueToday", "dueSoon", "upcoming"];

export default function TodoList({
  tasks,
  tags,
  goals,
  todayISO,
  onToggleComplete,
  onDelete,
  onQuickSchedule,
}: {
  tasks: Task[];
  tags: Tag[];
  goals: Goal[];
  todayISO: string;
  onToggleComplete: (taskId: string) => void;
  onDelete: (taskId: string) => void;
  onQuickSchedule: (task: Task) => void;
}) {
  const [filter, setFilter] = useState<Urgency | "all">("all");

  const tagById = new Map(tags.map((t) => [t.id, t]));
  const goalIndexById = new Map(goals.map((g, i) => [g.id, i]));

  const active = tasks.filter((t) => !t.completedDates.includes(todayISO));
  const completedToday = tasks.filter((t) => t.completedDates.includes(todayISO));

  const counts = FILTERABLE.reduce<Record<string, number>>((acc, level) => {
    acc[level] = active.filter((t) => getUrgency(t) === level).length;
    return acc;
  }, {});

  const visibleActive = filter === "all" ? active : active.filter((t) => getUrgency(t) === filter);

  const sorted = [...visibleActive].sort((a, b) => {
    const rankA = URGENCY_ORDER.indexOf(getUrgency(a));
    const rankB = URGENCY_ORDER.indexOf(getUrgency(b));
    if (rankA !== rankB) return rankA - rankB;
    return (a.dueTime ?? "99:99").localeCompare(b.dueTime ?? "99:99");
  });

  return (
    <div className={styles.wrap}>
      <div className={styles.filterRow}>
        <button
          type="button"
          className={`${styles.filterPill} ${filter === "all" ? styles.filterPillActive : ""}`}
          onClick={() => setFilter("all")}
        >
          All · {active.length}
        </button>
        {FILTERABLE.map((level) => (
          <button
            key={level}
            type="button"
            className={`${styles.filterPill} ${filter === level ? styles.filterPillActive : ""}`}
            style={{ "--accent": URGENCY_COLOR[level] } as CSSProperties}
            onClick={() => setFilter((prev) => (prev === level ? "all" : level))}
          >
            {URGENCY_LABEL[level]} · {counts[level]}
          </button>
        ))}
      </div>

      <div className={styles.list}>
        {sorted.length === 0 && (
          <p className={styles.empty}>
            {filter !== "all" ? "Nothing at this urgency level." : "Nothing on your list — add a task."}
          </p>
        )}

        {sorted.map((task) => {
          const urgency = getUrgency(task);
          const goal = goals.find((g) => g.id === task.goalId);
          return (
            <div
              key={task.id}
              className={styles.item}
              style={{ borderLeftColor: URGENCY_COLOR[urgency] }}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData(TASK_DRAG_MIME, task.id);
                e.dataTransfer.effectAllowed = "copy";
              }}
            >
              <input
                type="checkbox"
                className={styles.checkbox}
                checked={false}
                onChange={() => onToggleComplete(task.id)}
                aria-label={`Mark "${task.title}" complete`}
              />
              <div className={styles.main}>
                <div className={styles.topLine}>
                  <span className={styles.title}>{task.title}</span>
                  {task.repeat && <span className={styles.repeatBadge}>repeats</span>}
                </div>
                <div className={styles.metaLine}>
                  {task.dueDate && (
                    <span className={styles.due}>
                      Due {task.dueDate}
                      {task.dueTime ? ` · ${formatTimeLabel(task.dueTime)}` : ""}
                    </span>
                  )}
                  {goal && (
                    <span className={styles.tagChip}>
                      <span
                        className={styles.tagDot}
                        style={{ backgroundColor: getGoalColor(goalIndexById.get(goal.id) ?? 0) }}
                      />
                      {goal.label}
                    </span>
                  )}
                  {task.tagIds.map((id) => {
                    const tag = tagById.get(id);
                    if (!tag) return null;
                    return (
                      <span key={id} className={styles.tagChip}>
                        <span className={styles.tagDot} style={{ backgroundColor: tag.color }} />
                        {tag.label}
                      </span>
                    );
                  })}
                </div>
              </div>
              <div className={styles.actions}>
                <button
                  type="button"
                  className={styles.scheduleButton}
                  onClick={() => onQuickSchedule(task)}
                  title="Add to today's timetable"
                >
                  Schedule
                </button>
                <button
                  type="button"
                  className={styles.deleteButton}
                  onClick={() => onDelete(task.id)}
                  aria-label={`Delete "${task.title}"`}
                >
                  ×
                </button>
              </div>
            </div>
          );
        })}

        {completedToday.length > 0 && (
          <div className={styles.completedSection}>
            <p className={styles.completedHeading}>Completed today</p>
            {completedToday.map((task) => (
              <div key={task.id} className={`${styles.item} ${styles.itemDone}`}>
                <input
                  type="checkbox"
                  className={styles.checkbox}
                  checked
                  onChange={() => onToggleComplete(task.id)}
                  aria-label={`Mark "${task.title}" incomplete`}
                />
                <div className={styles.main}>
                  <span className={`${styles.title} ${styles.titleDone}`}>{task.title}</span>
                </div>
                <div className={styles.actions}>
                  <button
                    type="button"
                    className={styles.deleteButton}
                    onClick={() => onDelete(task.id)}
                    aria-label={`Delete "${task.title}"`}
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
