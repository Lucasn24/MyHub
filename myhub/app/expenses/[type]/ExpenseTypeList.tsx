"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "../page.module.css";
import ExpenseRow from "../ExpenseRow";
import { formatExpenseDate, type Expense } from "../data";
import type { ExpenseType } from "@/lib/backend";

// Mirrors the resynced-state pattern used elsewhere in the app (see
// app/tasks/TasksBoard.tsx) -- lets edits update the list immediately while
// still picking up the server's recomputed data after router.refresh().
function useResyncedState<T>(fromServer: T) {
  const [state, setState] = useState(fromServer);
  const [prev, setPrev] = useState(fromServer);
  if (prev !== fromServer) {
    setPrev(fromServer);
    setState(fromServer);
  }
  return [state, setState] as const;
}

export default function ExpenseTypeList({
  expenses,
  type,
  emptyLabel,
}: {
  expenses: Expense[];
  type: ExpenseType;
  emptyLabel: string;
}) {
  const router = useRouter();
  const [items, setItems] = useResyncedState(expenses);

  const handleSaved = (updated: Expense) => {
    setItems((prev) =>
      updated.type === type
        ? prev.map((e) => (e.id === updated.id ? updated : e))
        : prev.filter((e) => e.id !== updated.id)
    );
    router.refresh();
  };

  if (items.length === 0) {
    return (
      <ul className={styles.expenseList}>
        <li className={styles.listEmpty}>{emptyLabel}</li>
      </ul>
    );
  }

  return (
    <ul className={styles.expenseList}>
      {items.map((expense) => (
        <ExpenseRow
          key={expense.id}
          expense={expense}
          subtitle={formatExpenseDate(expense.date)}
          onSaved={handleSaved}
        />
      ))}
    </ul>
  );
}
