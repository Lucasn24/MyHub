"use client";

import { useState } from "react";
import type { RepeatFreq, RepeatRule, ScheduleBlock, Tag, Task } from "./types";
import { DURATION_OPTIONS_MINUTES, getTagColor } from "./constants";
import { WEEKDAY_LABELS } from "./occurrences";
import { minutesToTime, timeToMinutes } from "./time";
import modalStyles from "./modal.module.css";
import styles from "./TaskCreatorModal.module.css";

export default function EventEditorModal({
  block,
  tags,
  tasks,
  onClose,
  onCreateTag,
  onSave,
  onLinkTasks,
}: {
  block: ScheduleBlock;
  tags: Tag[];
  tasks: Task[];
  onClose: () => void;
  onCreateTag: (tag: Tag) => void;
  onSave: (blockId: string, updates: Partial<ScheduleBlock>) => void;
  onLinkTasks: (eventId: string, taskIds: string[]) => void;
}) {
  // Tasks that could reasonably be linked here -- already-linked tasks belong
  // to whichever event they're linked to, except this event's own links.
  const linkableTasks = tasks.filter((t) => !t.eventId || t.eventId === block.id);

  const [title, setTitle] = useState(block.title);
  const [notes, setNotes] = useState(block.notes ?? "");
  const [selectedTagId, setSelectedTagId] = useState<string | null>(block.tagId ?? null);
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>(
    tasks.filter((t) => t.eventId === block.id).map((t) => t.id)
  );
  const [newTagLabel, setNewTagLabel] = useState("");
  const [showTagForm, setShowTagForm] = useState(false);
  const [startTime, setStartTime] = useState(block.startTime);
  const [duration, setDuration] = useState(
    Math.max(15, timeToMinutes(block.endTime) - timeToMinutes(block.startTime))
  );
  const [repeatFreq, setRepeatFreq] = useState<RepeatFreq | "none">(block.repeat?.freq ?? "none");
  const [repeatDays, setRepeatDays] = useState<number[]>(block.repeat?.daysOfWeek ?? []);
  const [error, setError] = useState<string | null>(null);

  const toggleWeekday = (day: number) => {
    setRepeatDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()));
  };

  const toggleLinkedTask = (taskId: string) => {
    setSelectedTaskIds((prev) => (prev.includes(taskId) ? prev.filter((id) => id !== taskId) : [...prev, taskId]));
  };

  const handleAddTag = () => {
    const label = newTagLabel.trim();
    if (!label) return;
    const tag: Tag = { id: crypto.randomUUID(), label, createdAt: new Date().toISOString() };
    onCreateTag(tag);
    setSelectedTagId(tag.id);
    setNewTagLabel("");
    setShowTagForm(false);
  };

  const handleSubmit = () => {
    const trimmed = title.trim();
    if (!trimmed) {
      setError("Give the event a title.");
      return;
    }
    if (repeatFreq === "custom" && repeatDays.length === 0) {
      setError("Pick at least one day for the custom repeat.");
      return;
    }

    const repeat: RepeatRule | undefined =
      repeatFreq === "none" ? undefined : { freq: repeatFreq, daysOfWeek: repeatFreq === "custom" ? repeatDays : undefined };

    onSave(block.id, {
      title: trimmed,
      notes: notes.trim() || undefined,
      tagId: selectedTagId ?? undefined,
      repeat,
      startTime,
      endTime: minutesToTime(timeToMinutes(startTime) + duration),
    });
    onLinkTasks(block.id, selectedTaskIds);
  };

  return (
    <div className={modalStyles.overlay} onClick={onClose}>
      <div className={modalStyles.card} onClick={(e) => e.stopPropagation()}>
        <h2 className={modalStyles.title}>Edit event</h2>
        <p className={modalStyles.subtitle}>Update this event on today&apos;s timetable.</p>

        <div className={styles.formField}>
          <label>Title</label>
          <input
            type="text"
            className={styles.formInput}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
          />
        </div>

        <div className={styles.formField}>
          <label>Notes</label>
          <textarea
            className={styles.formTextarea}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
          />
        </div>

        <div className={styles.formField}>
          <label>Tag</label>
          <div className={styles.tagRow}>
            {tags.map((tag, index) => {
              const color = getTagColor(index);
              const active = selectedTagId === tag.id;
              return (
                <button
                  key={tag.id}
                  type="button"
                  className={`${styles.tagOption} ${active ? styles.tagOptionActive : ""}`}
                  style={active ? { backgroundColor: color, borderColor: color } : { borderColor: color }}
                  onClick={() => setSelectedTagId((prev) => (prev === tag.id ? null : tag.id))}
                >
                  {tag.label}
                </button>
              );
            })}
            <button type="button" className={styles.addTagButton} onClick={() => setShowTagForm((v) => !v)}>
              + New tag
            </button>
          </div>

          {showTagForm && (
            <div className={styles.newTagForm}>
              <input
                type="text"
                className={styles.formInput}
                placeholder="Tag name (e.g. Investments)"
                value={newTagLabel}
                onChange={(e) => setNewTagLabel(e.target.value)}
              />
              <button type="button" className={modalStyles.secondaryButton} onClick={handleAddTag}>
                Add tag
              </button>
            </div>
          )}
        </div>

        {linkableTasks.length > 0 && (
          <div className={styles.formField}>
            <label>Link tasks</label>
            <div className={styles.tagRow}>
              {linkableTasks.map((task) => {
                const active = selectedTaskIds.includes(task.id);
                return (
                  <button
                    key={task.id}
                    type="button"
                    className={`${styles.tagOption} ${active ? styles.taskOptionActive : ""}`}
                    onClick={() => toggleLinkedTask(task.id)}
                  >
                    {task.title}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className={styles.formField}>
          <label>Repeat</label>
          <select
            className={styles.formInput}
            value={repeatFreq}
            onChange={(e) => setRepeatFreq(e.target.value as RepeatFreq | "none")}
          >
            <option value="none">Doesn&apos;t repeat</option>
            <option value="daily">Daily</option>
            <option value="custom">Custom</option>
          </select>
          {repeatFreq === "custom" && (
            <div className={styles.weekdayRow}>
              {WEEKDAY_LABELS.map((label, day) => (
                <button
                  key={label}
                  type="button"
                  className={`${styles.weekdayButton} ${repeatDays.includes(day) ? styles.weekdayButtonActive : ""}`}
                  onClick={() => toggleWeekday(day)}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className={styles.formRow}>
          <div className={styles.formField}>
            <label>Start time</label>
            <input
              type="time"
              className={styles.formInput}
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
          </div>
          <div className={styles.formField}>
            <label>Duration</label>
            <select
              className={styles.formInput}
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
            >
              {DURATION_OPTIONS_MINUTES.map((m) => (
                <option key={m} value={m}>
                  {m < 60 ? `${m} min` : `${m / 60} hr${m > 60 ? "s" : ""}`}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && <p className={modalStyles.errorText}>{error}</p>}

        <div className={modalStyles.footer}>
          <button type="button" className={modalStyles.secondaryButton} onClick={onClose}>
            Cancel
          </button>
          <button type="button" className={modalStyles.primaryButton} onClick={handleSubmit}>
            Save changes
          </button>
        </div>
      </div>
    </div>
  );
}
