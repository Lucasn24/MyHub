"use client";

import { useEffect, useRef, useState } from "react";
import { MoreHorizontal } from "lucide-react";
import styles from "./page.module.css";
import { EXPENSE_TYPE_LABEL, formatCost, type Expense } from "./data";
import type { ExpenseType } from "@/lib/backend";

const EXPENSE_TYPES = Object.keys(EXPENSE_TYPE_LABEL) as ExpenseType[];

export default function ExpenseRow({
  expense,
  subtitle,
  onSaved,
}: {
  expense: Expense;
  subtitle: string;
  onSaved: (updated: Expense) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(expense.title);
  const [type, setType] = useState<ExpenseType>(expense.type);
  const [cost, setCost] = useState(String(expense.cost));
  const [saving, setSaving] = useState(false);
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

  const startEditing = () => {
    setTitle(expense.title);
    setType(expense.type);
    setCost(String(expense.cost));
    setError(null);
    setMenuOpen(false);
    setEditing(true);
  };

  const cancelEditing = () => {
    setEditing(false);
    setError(null);
  };

  const handleSave = async () => {
    const trimmedTitle = title.trim();
    const parsedCost = Number(cost);
    if (!trimmedTitle) {
      setError("Name can't be empty.");
      return;
    }
    if (!Number.isFinite(parsedCost) || parsedCost <= 0) {
      setError("Cost must be a positive number.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/expenses/${expense.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: trimmedTitle, type, cost: parsedCost }),
      });
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      const updated = await res.json();
      onSaved({
        id: updated.id,
        title: updated.title,
        type: updated.type,
        cost: Number(updated.cost),
        date: updated.date,
        createdAt: updated.created_at ?? expense.createdAt,
      });
      setEditing(false);
    } catch {
      setError("Couldn't save changes. Try again.");
    } finally {
      setSaving(false);
    }
  };

  if (editing) {
    return (
      <li className={styles.expenseItem}>
        <div className={styles.editForm}>
          <div className={styles.editRow}>
            <input
              className={styles.editInput}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Name"
              disabled={saving}
              autoFocus
            />
            <select
              className={styles.editSelect}
              value={type}
              onChange={(e) => setType(e.target.value as ExpenseType)}
              disabled={saving}
            >
              {EXPENSE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {EXPENSE_TYPE_LABEL[t]}
                </option>
              ))}
            </select>
            <input
              className={styles.editInputCost}
              type="number"
              step="0.01"
              min="0"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              disabled={saving}
            />
          </div>
          {error && <span className={styles.editError}>{error}</span>}
          <div className={styles.editActions}>
            <button type="button" className={styles.editButton} onClick={cancelEditing} disabled={saving}>
              Cancel
            </button>
            <button type="button" className={styles.editButtonPrimary} onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </li>
    );
  }

  return (
    <li className={styles.expenseItem}>
      <div className={styles.expenseMain}>
        <div className={styles.expenseTopLine}>
          <span className={styles.expenseTitle}>{expense.title}</span>
          <span className={styles.expenseDate}>{subtitle}</span>
        </div>
      </div>
      <div className={styles.expenseRowActions}>
        <span className={styles.expenseCost}>{formatCost(expense.cost)}</span>
        <div className={styles.expenseMenuWrap} ref={menuRef}>
          <button
            type="button"
            className={styles.expenseMenuButton}
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Expense options"
          >
            <MoreHorizontal size={16} />
          </button>
          {menuOpen && (
            <div className={styles.expenseMenu}>
              <button type="button" className={styles.expenseMenuItem} onClick={startEditing}>
                Edit
              </button>
            </div>
          )}
        </div>
      </div>
    </li>
  );
}
