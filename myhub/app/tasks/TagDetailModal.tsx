"use client";

import { useEffect, useRef, useState } from "react";
import { MoreHorizontal } from "lucide-react";
import type { Tag, Task } from "./types";
import modalStyles from "./modal.module.css";
import styles from "./TagDetailModal.module.css";

export default function TagDetailModal({
  tag,
  tasks,
  onClose,
  onSave,
  onDelete,
}: {
  tag: Tag;
  tasks: Task[];
  onClose: () => void;
  onSave: (tagId: string, label: string) => void;
  onDelete: (tagId: string) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [label, setLabel] = useState(tag.label);
  const [error, setError] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  const completedTasks = tasks
    .filter((t) => t.tagId === tag.id && t.completedDates.length > 0)
    .sort((a, b) =>
      b.completedDates[b.completedDates.length - 1].localeCompare(a.completedDates[a.completedDates.length - 1])
    );

  const handleSave = () => {
    const trimmed = label.trim();
    if (!trimmed) {
      setError("Give the tag a name.");
      return;
    }
    onSave(tag.id, trimmed);
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setLabel(tag.label);
    setError(null);
    setIsEditing(false);
  };

  const handleDelete = () => {
    if (window.confirm(`Delete "${tag.label}"? This can't be undone.`)) {
      onDelete(tag.id);
    }
  };

  return (
    <div className={modalStyles.overlay} onClick={onClose}>
      <div className={modalStyles.card} onClick={(e) => e.stopPropagation()}>
        <div className={styles.titleRow}>
          {isEditing ? (
            <input
              type="text"
              className={styles.titleInput}
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              autoFocus
            />
          ) : (
            <h2 className={modalStyles.title}>{tag.label}</h2>
          )}

          {!isEditing && (
            <div className={styles.menuWrap} ref={menuRef}>
              <button
                type="button"
                className={styles.menuButton}
                onClick={() => setMenuOpen((v) => !v)}
                aria-label="Tag options"
              >
                <MoreHorizontal size={18} />
              </button>
              {menuOpen && (
                <div className={styles.menu}>
                  <button
                    type="button"
                    className={styles.menuItem}
                    onClick={() => {
                      setMenuOpen(false);
                      setIsEditing(true);
                    }}
                  >
                    Edit
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <p className={modalStyles.subtitle}>
          {completedTasks.length} task{completedTasks.length === 1 ? "" : "s"} completed
        </p>

        {completedTasks.length === 0 ? (
          <p className={styles.empty}>Nothing completed under this tag yet.</p>
        ) : (
          <ul className={styles.list}>
            {completedTasks.map((task) => (
              <li key={task.id} className={styles.item}>
                <div className={styles.itemMain}>
                  <span className={styles.itemTitle}>{task.title}</span>
                  <span className={styles.itemMeta}>
                    Completed {task.completedDates[task.completedDates.length - 1]}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}

        {error && <p className={modalStyles.errorText}>{error}</p>}

        <div className={styles.footer}>
          <button type="button" className={styles.deleteButton} onClick={handleDelete}>
            Delete
          </button>
          <div className={styles.footerActions}>
            {isEditing ? (
              <>
                <button type="button" className={modalStyles.secondaryButton} onClick={handleCancelEdit}>
                  Cancel
                </button>
                <button type="button" className={modalStyles.primaryButton} onClick={handleSave}>
                  Save
                </button>
              </>
            ) : (
              <button type="button" className={modalStyles.secondaryButton} onClick={onClose}>
                Close
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
