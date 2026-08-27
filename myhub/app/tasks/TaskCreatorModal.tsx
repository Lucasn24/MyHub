"use client";

import { useState } from "react";
import type { Goal, RepeatFreq, RepeatRule, ScheduleBlock, Tag, Task } from "./types";
import { DURATION_OPTIONS_MINUTES, TAG_COLOR_PRESETS, getGoalColor } from "./constants";
import { WEEKDAY_LABELS } from "./occurrences";
import { minutesToTime, timeToMinutes } from "./time";
import modalStyles from "./modal.module.css";
import styles from "./TaskCreatorModal.module.css";

type CreatorMode = "event" | "task";

export default function TaskCreatorModal({
  tags,
  goals,
  todayISO,
  initialRange,
  onClose,
  onCreateTag,
  onCreateGoal,
  onCreate,
}: {
  tags: Tag[];
  goals: Goal[];
  todayISO: string;
  initialRange?: { startTime: string; endTime: string } | null;
  onClose: () => void;
  onCreateTag: (tag: Tag) => void;
  onCreateGoal: (goal: Goal) => void;
  onCreate: (payload: { task?: Task; block?: ScheduleBlock }) => void;
}) {
  const [mode, setMode] = useState<CreatorMode>("event");

  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [dueDate, setDueDate] = useState(todayISO);
  const [dueTime, setDueTime] = useState("");
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const [newGoalLabel, setNewGoalLabel] = useState("");
  const [showGoalForm, setShowGoalForm] = useState(false);

  const [repeatFreq, setRepeatFreq] = useState<RepeatFreq | "none">("none");
  const [repeatDays, setRepeatDays] = useState<number[]>([]);

  const [scheduleEnabled, setScheduleEnabled] = useState(Boolean(initialRange));
  const [scheduleStart, setScheduleStart] = useState(initialRange?.startTime ?? "09:00");
  const initialDuration = initialRange
    ? Math.max(15, timeToMinutes(initialRange.endTime) - timeToMinutes(initialRange.startTime))
    : 30;
  const [scheduleDuration, setScheduleDuration] = useState(initialDuration);

  const [newTagLabel, setNewTagLabel] = useState("");
  const [newTagColor, setNewTagColor] = useState(TAG_COLOR_PRESETS[0]);
  const [showTagForm, setShowTagForm] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const toggleTag = (id: string) => {
    setSelectedTagIds((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]));
  };

  const toggleWeekday = (day: number) => {
    setRepeatDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()));
  };

  const handleAddTag = () => {
    const label = newTagLabel.trim();
    if (!label) return;
    const tag: Tag = { id: crypto.randomUUID(), label, color: newTagColor };
    onCreateTag(tag);
    setSelectedTagIds((prev) => [...prev, tag.id]);
    setNewTagLabel("");
    setShowTagForm(false);
  };

  const handleAddGoal = () => {
    const label = newGoalLabel.trim();
    if (!label) return;
    const goal: Goal = { id: crypto.randomUUID(), label, createdAt: new Date().toISOString() };
    onCreateGoal(goal);
    setSelectedGoalId(goal.id);
    setNewGoalLabel("");
    setShowGoalForm(false);
  };

  const handleSubmit = () => {
    const trimmed = title.trim();
    if (!trimmed) {
      setError(mode === "event" ? "Give the event a title." : "Give the task a title.");
      return;
    }
    if (repeatFreq === "weekly" && repeatDays.length === 0) {
      setError("Pick at least one day for the weekly repeat.");
      return;
    }

    const repeat: RepeatRule | undefined =
      repeatFreq === "none" ? undefined : { freq: repeatFreq, daysOfWeek: repeatFreq === "weekly" ? repeatDays : undefined };

    if (mode === "event") {
      const startMinutes = timeToMinutes(scheduleStart);
      const block: ScheduleBlock = {
        id: crypto.randomUUID(),
        title: trimmed,
        notes: notes.trim() || undefined,
        date: todayISO,
        startTime: scheduleStart,
        endTime: minutesToTime(startMinutes + scheduleDuration),
        tagIds: selectedTagIds,
        goalId: selectedGoalId ?? undefined,
        repeat,
        pushedToGoogle: false,
      };
      onCreate({ block });
      return;
    }

    const task: Task = {
      id: crypto.randomUUID(),
      title: trimmed,
      notes: notes.trim() || undefined,
      dueDate: dueDate || undefined,
      dueTime: dueDate && dueTime ? dueTime : undefined,
      tagIds: selectedTagIds,
      goalId: selectedGoalId ?? undefined,
      repeat,
      completedDates: [],
      createdAt: new Date().toISOString(),
    };

    let block: ScheduleBlock | undefined;
    if (scheduleEnabled) {
      const startMinutes = timeToMinutes(scheduleStart);
      block = {
        id: crypto.randomUUID(),
        taskId: task.id,
        title: trimmed,
        date: todayISO,
        startTime: scheduleStart,
        endTime: minutesToTime(startMinutes + scheduleDuration),
        tagIds: selectedTagIds,
        pushedToGoogle: false,
      };
    }

    onCreate({ task, block });
  };

  return (
    <div className={modalStyles.overlay} onClick={onClose}>
      <div className={modalStyles.card} onClick={(e) => e.stopPropagation()}>
        <h2 className={modalStyles.title}>{mode === "event" ? "New event" : "New task"}</h2>
        <p className={modalStyles.subtitle}>
          {mode === "event"
            ? "Add an event to today's timetable."
            : "Add a to-do, optionally schedule it on today's timetable."}
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
          <label>Tags</label>
          <div className={styles.tagRow}>
            {tags.map((tag) => {
              const active = selectedTagIds.includes(tag.id);
              return (
                <button
                  key={tag.id}
                  type="button"
                  className={`${styles.tagOption} ${active ? styles.tagOptionActive : ""}`}
                  style={active ? { backgroundColor: tag.color, borderColor: tag.color } : { borderColor: tag.color }}
                  onClick={() => toggleTag(tag.id)}
                >
                  {tag.label}
                </button>
              );
            })}
            <button
              type="button"
              className={styles.addTagButton}
              onClick={() => setShowTagForm((v) => !v)}
            >
              + New tag
            </button>
          </div>

          {showTagForm && (
            <div className={styles.newTagForm}>
              <input
                type="text"
                className={styles.formInput}
                placeholder="Tag name"
                value={newTagLabel}
                onChange={(e) => setNewTagLabel(e.target.value)}
              />
              <div className={styles.colorSwatches}>
                {TAG_COLOR_PRESETS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`${styles.swatch} ${newTagColor === color ? styles.swatchActive : ""}`}
                    style={{ backgroundColor: color }}
                    onClick={() => setNewTagColor(color)}
                    aria-label={`Use color ${color}`}
                  />
                ))}
              </div>
              <button type="button" className={modalStyles.secondaryButton} onClick={handleAddTag}>
                Add tag
              </button>
            </div>
          )}
        </div>

        <div className={styles.formField}>
          <label>Goal</label>
          <div className={styles.tagRow}>
            {goals.map((goal, index) => {
              const color = getGoalColor(index);
              const active = selectedGoalId === goal.id;
              return (
                <button
                  key={goal.id}
                  type="button"
                  className={`${styles.tagOption} ${active ? styles.tagOptionActive : ""}`}
                  style={active ? { backgroundColor: color, borderColor: color } : { borderColor: color }}
                  onClick={() => setSelectedGoalId((prev) => (prev === goal.id ? null : goal.id))}
                >
                  {goal.label}
                </button>
              );
            })}
            <button type="button" className={styles.addTagButton} onClick={() => setShowGoalForm((v) => !v)}>
              + New goal
            </button>
          </div>

          {showGoalForm && (
            <div className={styles.newTagForm}>
              <input
                type="text"
                className={styles.formInput}
                placeholder="Goal name (e.g. Investments)"
                value={newGoalLabel}
                onChange={(e) => setNewGoalLabel(e.target.value)}
              />
              <button type="button" className={modalStyles.secondaryButton} onClick={handleAddGoal}>
                Add goal
              </button>
            </div>
          )}
        </div>

        <div className={styles.formField}>
          <label>Repeat</label>
          <select
            className={styles.formInput}
            value={repeatFreq}
            onChange={(e) => setRepeatFreq(e.target.value as RepeatFreq | "none")}
          >
            <option value="none">Doesn&apos;t repeat</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
          </select>
          {repeatFreq === "weekly" && (
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

        {mode === "event" ? (
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
        ) : (
          <div className={styles.formField}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={scheduleEnabled}
                onChange={(e) => setScheduleEnabled(e.target.checked)}
              />
              Add to today&apos;s timetable
            </label>

            {scheduleEnabled && (
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
            )}
          </div>
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
