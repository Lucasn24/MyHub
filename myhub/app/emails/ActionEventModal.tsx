"use client";

import { useState } from "react";
import styles from "./page.module.css";
import type { EventDetail, HighlightDetail } from "./data";

export default function ActionEventModal({
  label,
  detail,
  onClose,
  onConfirmed,
}: {
  label: string;
  detail: HighlightDetail;
  onClose: () => void;
  onConfirmed: () => void;
}) {
  const [form, setForm] = useState<HighlightDetail>(detail);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    setSaving(true);
    setError(null);
    try {
      if (form.kind === "task") {
        await fetch(`/api/emails/tasks/${form.id}/confirm`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            description: form.description,
            due_date: form.dueDate || null,
            due_date_text: null,
          }),
        });
      } else {
        await fetch(`/api/emails/events/${form.id}/confirm`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: form.title,
            status: form.status,
            location: form.location || null,
            start: form.start || null,
            end: form.end || null,
          }),
        });
      }
      onConfirmed();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save — try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
        <h2 className={styles.modalTitle}>{form.kind === "task" ? "Edit action" : "Edit event"}</h2>
        <p className={styles.modalSubtitle}>{label}</p>

        {form.kind === "task" ? (
          <>
            <div className={styles.formField}>
              <label>Description</label>
              <input
                type="text"
                className={styles.formInput}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div className={styles.formField}>
              <label>Due date</label>
              <input
                type="date"
                className={styles.formInput}
                value={form.dueDate}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
              />
            </div>
          </>
        ) : (
          <>
            <div className={styles.formField}>
              <label>Title</label>
              <input
                type="text"
                className={styles.formInput}
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div className={styles.formField}>
              <label>Status</label>
              <select
                className={styles.formInput}
                value={form.status}
                onChange={(e) =>
                  setForm({ ...form, status: e.target.value as EventDetail["status"] })
                }
              >
                <option value="proposed">Proposed</option>
                <option value="confirmed">Confirmed</option>
                <option value="rescheduled">Rescheduled</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div className={styles.formField}>
              <label>Location</label>
              <input
                type="text"
                className={styles.formInput}
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
              />
            </div>
            <div className={styles.formRow}>
              <div className={styles.formField}>
                <label>Start</label>
                <input
                  type="datetime-local"
                  className={styles.formInput}
                  value={form.start}
                  onChange={(e) => setForm({ ...form, start: e.target.value })}
                />
              </div>
              <div className={styles.formField}>
                <label>End</label>
                <input
                  type="datetime-local"
                  className={styles.formInput}
                  value={form.end}
                  onChange={(e) => setForm({ ...form, end: e.target.value })}
                />
              </div>
            </div>
          </>
        )}

        {error && <p className={styles.modalError}>{error}</p>}

        <div className={styles.modalFooter}>
          <button type="button" className={styles.viewAllButton} onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="button" className={styles.modalOkButton} onClick={handleConfirm} disabled={saving}>
            {saving ? "Saving…" : "OK"}
          </button>
        </div>
      </div>
    </div>
  );
}
