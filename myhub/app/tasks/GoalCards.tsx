"use client";

import { useState } from "react";
import type { CSSProperties } from "react";
import type { Goal, Task } from "./types";
import { getGoalColor } from "./constants";
import styles from "./GoalCards.module.css";

export default function GoalCards({
  goals,
  tasks,
  onOpenGoal,
  onCreateGoal,
}: {
  goals: Goal[];
  tasks: Task[];
  onOpenGoal: (goalId: string) => void;
  onCreateGoal: (goal: Goal) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [label, setLabel] = useState("");

  const completedCount = (goalId: string): number =>
    tasks.filter((t) => t.goalId === goalId && t.completedDates.length > 0).length;

  const handleAdd = () => {
    const trimmed = label.trim();
    if (!trimmed) {
      setAdding(false);
      return;
    }
    onCreateGoal({ id: crypto.randomUUID(), label: trimmed, createdAt: new Date().toISOString() });
    setLabel("");
    setAdding(false);
  };

  return (
    <div className={styles.row}>
      {goals.map((goal, index) => {
        const color = getGoalColor(index);
        return (
          <button
            key={goal.id}
            type="button"
            className={styles.card}
            style={{ "--accent": color } as CSSProperties}
            onClick={() => onOpenGoal(goal.id)}
          >
            <span className={styles.count}>{completedCount(goal.id)}</span>
            <span className={styles.label}>{goal.label}</span>
          </button>
        );
      })}

      {adding ? (
        <div className={styles.addForm}>
          <input
            type="text"
            className={styles.addInput}
            placeholder="Goal name"
            value={label}
            autoFocus
            onChange={(e) => setLabel(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAdd();
              if (e.key === "Escape") setAdding(false);
            }}
            onBlur={handleAdd}
          />
        </div>
      ) : (
        <button type="button" className={styles.addCard} onClick={() => setAdding(true)}>
          + Add goal
        </button>
      )}
    </div>
  );
}
