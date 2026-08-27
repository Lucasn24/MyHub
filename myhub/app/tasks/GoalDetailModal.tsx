"use client";

import type { Goal, ScheduleBlock, Task } from "./types";
import { timeToMinutes } from "./time";
import modalStyles from "./modal.module.css";
import styles from "./GoalDetailModal.module.css";

function hoursForTask(task: Task, blocks: ScheduleBlock[]): number {
  const minutes = blocks
    .filter((b) => b.taskId === task.id && task.completedDates.includes(b.date))
    .reduce((sum, b) => sum + (timeToMinutes(b.endTime) - timeToMinutes(b.startTime)), 0);
  return minutes / 60;
}

export default function GoalDetailModal({
  goal,
  tasks,
  blocks,
  onClose,
}: {
  goal: Goal;
  tasks: Task[];
  blocks: ScheduleBlock[];
  onClose: () => void;
}) {
  const completedTasks = tasks
    .filter((t) => t.goalId === goal.id && t.completedDates.length > 0)
    .map((t) => ({ task: t, hours: hoursForTask(t, blocks) }))
    .sort((a, b) => b.task.completedDates[b.task.completedDates.length - 1].localeCompare(
      a.task.completedDates[a.task.completedDates.length - 1]
    ));

  const totalHours = completedTasks.reduce((sum, t) => sum + t.hours, 0);

  return (
    <div className={modalStyles.overlay} onClick={onClose}>
      <div className={modalStyles.card} onClick={(e) => e.stopPropagation()}>
        <h2 className={modalStyles.title}>{goal.label}</h2>
        <p className={modalStyles.subtitle}>
          {completedTasks.length} task{completedTasks.length === 1 ? "" : "s"} completed
          {totalHours > 0 ? ` · ${totalHours.toFixed(1)}h logged` : ""}
        </p>

        {completedTasks.length === 0 ? (
          <p className={styles.empty}>Nothing completed under this goal yet.</p>
        ) : (
          <ul className={styles.list}>
            {completedTasks.map(({ task, hours }) => (
              <li key={task.id} className={styles.item}>
                <div className={styles.itemMain}>
                  <span className={styles.itemTitle}>{task.title}</span>
                  <span className={styles.itemMeta}>
                    {task.repeat
                      ? `Completed ${task.completedDates.length} time${task.completedDates.length === 1 ? "" : "s"}`
                      : `Completed ${task.completedDates[task.completedDates.length - 1]}`}
                  </span>
                </div>
                {hours > 0 && <span className={styles.itemHours}>{hours.toFixed(1)}h</span>}
              </li>
            ))}
          </ul>
        )}

        <div className={modalStyles.footer}>
          <button type="button" className={modalStyles.secondaryButton} onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
