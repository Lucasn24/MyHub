"use client";

import { useState } from "react";
import type { ScheduleBlock, Tag, Task, Urgency } from "./types";
import { URGENCY_COLOR, URGENCY_LABEL, URGENCY_ORDER, getUrgency } from "./urgency";
import { getTagColor } from "./constants";
import { formatTimeLabel } from "./time";
import styles from "./TodoList.module.css";

const FILTERABLE: Urgency[] = ["overdue", "dueToday", "dueSoon", "upcoming", "none"];

export default function TodoList({
  tasks,
  tags,
  blocks,
  todayISO,
  onToggleComplete,
  onDelete,
  onSchedule,
}: {
  tasks: Task[];
  tags: Tag[];
  blocks: ScheduleBlock[];
  todayISO: string;
  onToggleComplete: (taskId: string) => void;
  onDelete: (taskId: string) => void;
  onSchedule: (taskId: string) => void;
}) {
  const [dueFilter, setDueFilter] = useState<Urgency | "all">("all");
  const [tagFilter, setTagFilter] = useState<string | "all">("all");

  const tagIndexById = new Map(tags.map((t, i) => [t.id, i]));
  const blockById = new Map(blocks.map((b) => [b.id, b]));

  const active = tasks.filter((t) => !t.completedDates.includes(todayISO));
  const completedToday = tasks.filter((t) => t.completedDates.includes(todayISO));

  const dueCounts = FILTERABLE.reduce<Record<string, number>>((acc, level) => {
    acc[level] = active.filter((t) => getUrgency(t) === level).length;
    return acc;
  }, {});

  const tagCounts = new Map(tags.map((t) => [t.id, active.filter((task) => task.tagId === t.id).length]));

  const visibleActive = active
    .filter((t) => dueFilter === "all" || getUrgency(t) === dueFilter)
    .filter((t) => tagFilter === "all" || t.tagId === tagFilter);

  const sorted = [...visibleActive].sort((a, b) => {
    const rankA = URGENCY_ORDER.indexOf(getUrgency(a));
    const rankB = URGENCY_ORDER.indexOf(getUrgency(b));
    if (rankA !== rankB) return rankA - rankB;
    return (a.dueTime ?? "99:99").localeCompare(b.dueTime ?? "99:99");
  });

  const isFiltered = dueFilter !== "all" || tagFilter !== "all";

  return (
    <div className={styles.wrap}>
      <div className={styles.filterRow}>
        <select
          className={styles.filterSelect}
          value={dueFilter}
          onChange={(e) => setDueFilter(e.target.value as Urgency | "all")}
          aria-label="Filter by due date"
        >
          <option value="all">Due date · All ({active.length})</option>
          {FILTERABLE.map((level) => (
            <option key={level} value={level}>
              {URGENCY_LABEL[level]} ({dueCounts[level]})
            </option>
          ))}
        </select>

        <select
          className={styles.filterSelect}
          value={tagFilter}
          onChange={(e) => setTagFilter(e.target.value)}
          aria-label="Filter by tag"
        >
          <option value="all">Tag · All</option>
          {tags.map((tag) => (
            <option key={tag.id} value={tag.id}>
              {tag.label} ({tagCounts.get(tag.id) ?? 0})
            </option>
          ))}
        </select>
      </div>

      <div className={styles.list}>
        {sorted.length === 0 && (
          <p className={styles.empty}>
            {isFiltered ? "Nothing matches these filters." : "Nothing on your list — add a task."}
          </p>
        )}

        {sorted.map((task) => {
          const urgency = getUrgency(task);
          const tag = tags.find((t) => t.id === task.tagId);
          const event = task.eventId ? blockById.get(task.eventId) : undefined;
          return (
            <div key={task.id} className={styles.item} style={{ borderLeftColor: URGENCY_COLOR[urgency] }}>
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
                </div>
                <div className={styles.metaLine}>
                  {task.dueDate && (
                    <span className={styles.due}>
                      Due {task.dueDate}
                      {task.dueTime ? ` · ${formatTimeLabel(task.dueTime)}` : ""}
                    </span>
                  )}
                  {tag && (
                    <span className={styles.tagChip}>
                      <span
                        className={styles.tagDot}
                        style={{ backgroundColor: getTagColor(tagIndexById.get(tag.id) ?? 0) }}
                      />
                      {tag.label}
                    </span>
                  )}
                  {event && <span className={styles.tagChip}>📅 {event.title}</span>}
                </div>
              </div>
              <div className={styles.actions}>
                {!event && (
                  <button
                    type="button"
                    className={styles.scheduleButton}
                    onClick={() => onSchedule(task.id)}
                    title="Schedule an event for this task"
                  >
                    Schedule
                  </button>
                )}
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
