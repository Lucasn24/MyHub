"use client";

import { useState } from "react";
import type { CSSProperties } from "react";
import type { Tag, Task } from "./types";
import { getTagColor } from "./constants";
import styles from "./TagCards.module.css";

export default function TagCards({
  tags,
  tasks,
  onOpenTag,
  onCreateTag,
}: {
  tags: Tag[];
  tasks: Task[];
  onOpenTag: (tagId: string) => void;
  onCreateTag: (tag: Tag) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [label, setLabel] = useState("");

  const completedCount = (tagId: string): number =>
    tasks.filter((t) => t.tagId === tagId && t.completedDates.length > 0).length;

  const handleAdd = () => {
    const trimmed = label.trim();
    if (!trimmed) {
      setAdding(false);
      return;
    }
    onCreateTag({ id: crypto.randomUUID(), label: trimmed, createdAt: new Date().toISOString() });
    setLabel("");
    setAdding(false);
  };

  return (
    <div className={styles.row}>
      {tags.map((tag, index) => {
        const color = getTagColor(index);
        return (
          <button
            key={tag.id}
            type="button"
            className={styles.card}
            style={{ "--accent": color } as CSSProperties}
            onClick={() => onOpenTag(tag.id)}
          >
            <span className={styles.label}>{tag.label}</span>
            <span className={styles.count}>{completedCount(tag.id)}</span>
          </button>
        );
      })}

      {adding ? (
        <div className={styles.addForm}>
          <input
            type="text"
            className={styles.addInput}
            placeholder="Tag name"
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
          + Add tag
        </button>
      )}
    </div>
  );
}
