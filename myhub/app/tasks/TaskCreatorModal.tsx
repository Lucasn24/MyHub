"use client";

import { useState } from "react";
import type { RepeatFreq, RepeatRule, ScheduleBlock, Tag, Task } from "./types";
import { DURATION_OPTIONS_MINUTES, getTagColor } from "./constants";
import { WEEKDAY_LABELS } from "./occurrences";
import { minutesToTime, timeToMinutes } from "./time";
import modalStyles from "./modal.module.css";
import styles from "./TaskCreatorModal.module.css";

type CreatorMode = "event" | "task";

export default function TaskCreatorModal({
  tags,
  tasks,
  selectedDate,
  initialRange,
  presetTaskId,
  defaultMode = "event",
  onClose,
  onCreateTag,
  onCreate,
}: {
  tags: Tag[];
  tasks: Task[];
  selectedDate: string;
  initialRange?: { startTime: string; endTime: string } | null;
  presetTaskId?: string;
  defaultMode?: CreatorMode;
  onClose: () => void;
  onCreateTag: (tag: Tag) => void;
  onCreate: (payload: { task?: Task; block?: ScheduleBlock; linkedTaskIds?: string[] }) => void;
}) {
  const presetTask = presetTaskId ? tasks.find((t) => t.id === presetTaskId) : undefined;
  // Tasks that could reasonably be linked here -- already-linked tasks belong
  // to whichever event they're linked to, not up for grabs from a new one.
  const linkableTasks = tasks.filter((t) => !t.eventId || t.id === presetTaskId);

  const [mode, setMode] = useState<CreatorMode>(defaultMode);

  const [title, setTitle] = useState(presetTask?.title ?? "");
  const [notes, setNotes] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [dueTime, setDueTime] = useState("");
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>(presetTaskId ? [presetTaskId] : []);
  const [newTagLabel, setNewTagLabel] = useState("");
  const [showTagForm, setShowTagForm] = useState(false);

  const [repeatFreq, setRepeatFreq] = useState<RepeatFreq | "none">("none");
  const [repeatDays, setRepeatDays] = useState<number[]>([]);

  const [scheduleStart, setScheduleStart] = useState(initialRange?.startTime ?? "09:00");
  const initialDuration = initialRange
    ? Math.max(15, timeToMinutes(initialRange.endTime) - timeToMinutes(initialRange.startTime))
    : 30;
  const [scheduleDuration, setScheduleDuration] = useState(initialDuration);

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
      setError(mode === "event" ? "Give the event a title." : "Give the task a title.");
      return;
    }

    if (mode === "event") {
      if (repeatFreq === "custom" && repeatDays.length === 0) {
        setError("Pick at least one day for the custom repeat.");
        return;
      }
      const repeat: RepeatRule | undefined =
        repeatFreq === "none" ? undefined : { freq: repeatFreq, daysOfWeek: repeatFreq === "custom" ? repeatDays : undefined };

      const startMinutes = timeToMinutes(scheduleStart);
      const block: ScheduleBlock = {
        id: crypto.randomUUID(),
        title: trimmed,
        notes: notes.trim() || undefined,
        date: selectedDate,
        startTime: scheduleStart,
        endTime: minutesToTime(startMinutes + scheduleDuration),
        tagId: selectedTagId ?? undefined,
        repeat,
        pushedToGoogle: false,
      };
      onCreate({ block, linkedTaskIds: selectedTaskIds });
      return;
    }

    const task: Task = {
      id: crypto.randomUUID(),
      title: trimmed,
      notes: notes.trim() || undefined,
      dueDate: dueDate || undefined,
      dueTime: dueDate && dueTime ? dueTime : undefined,
      tagId: selectedTagId ?? undefined,
      completedDates: [],
      createdAt: new Date().toISOString(),
    };

    onCreate({ task });
  };

  return (
    <div className={modalStyles.overlay} onClick={onClose}>
      <div className={modalStyles.card} onClick={(e) => e.stopPropagation()}>
        <h2 className={modalStyles.title}>{mode === "event" ? "New event" : "New task"}</h2>
        <p className={modalStyles.subtitle}>
          {mode === "event" ? "Add an event to the timetable." : "Add a to-do."}
        </p>

        <div className={styles.modeToggle} role="tablist" aria-label="Create event or task">
          <button
            type="button"
            role="tab"
            aria-selected={mode === "event"}
            className={`${styles.modeButton} ${mode === "event" ? styles.modeButtonActive : ""}`}
            onClick={() => setMode("event")}
          >
            Event
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "task"}
            className={`${styles.modeButton} ${mode === "task" ? styles.modeButtonActive : ""}`}
            onClick={() => setMode("task")}
          >
            Task
          </button>
        </div>

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

        {mode === "task" && (
          <div className={styles.formRow}>
            <div className={styles.formField}>
              <label>Due date</label>
              <input
                type="date"
                className={styles.formInput}
                value={dueDate}
                placeholder="No due date"
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
            <div className={styles.formField}>
              <label>Due time</label>
              <input
                type="time"
                className={styles.formInput}
                value={dueTime}
                disabled={!dueDate}
                onChange={(e) => setDueTime(e.target.value)}
              />
            </div>
          </div>
        )}

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

        {mode === "event" && linkableTasks.length > 0 && (
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

        {mode === "event" && (
          <>
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

            <div className={styles.formField}>
              <div className={styles.formRow}>
                <div className={styles.formField}>
                  <label>Start time</label>
                  <input
                    type="time"
                    className={styles.formInput}
                    value={scheduleStart}
                    onChange={(e) => setScheduleStart(e.target.value)}
                  />
                </div>
                <div className={styles.formField}>
                  <label>Duration</label>
                  <select
                    className={styles.formInput}
                    value={scheduleDuration}
                    onChange={(e) => setScheduleDuration(Number(e.target.value))}
                  >
                    {DURATION_OPTIONS_MINUTES.map((m) => (
                      <option key={m} value={m}>
                        {m < 60 ? `${m} min` : `${m / 60} hr${m > 60 ? "s" : ""}`}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </>
        )}

        {error && <p className={modalStyles.errorText}>{error}</p>}

        <div className={modalStyles.footer}>
          <button type="button" className={modalStyles.secondaryButton} onClick={onClose}>
            Cancel
          </button>
          <button type="button" className={modalStyles.primaryButton} onClick={handleSubmit}>
            {mode === "event" ? "Create event" : "Create task"}
          </button>
        </div>
      </div>
    </div>
  );
}
