import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import styles from "../page.module.css";
import {
  EXPENSE_TYPE_LABEL,
  formatCost,
  formatExpenseDate,
  isInPeriod,
  mapInboxExpense,
  periodLabel,
  type Expense,
  type Period,
} from "../data";
import { getExpenses, type ExpenseType } from "@/lib/backend";
import { hasTokens } from "@/lib/google/tokenStore";

function isExpenseType(value: string): value is ExpenseType {
  return value in EXPENSE_TYPE_LABEL;
}

async function getAllExpenses(): Promise<Expense[]> {
  if (!(await hasTokens())) return [];
  try {
    const expenses = await getExpenses();
    return expenses.map(mapInboxExpense);
  } catch (err) {
    console.error("Failed to load expenses from backend:", err);
    return [];
  }
}

export default async function ExpenseTypeDetail({
  params,
  searchParams,
}: {
  params: Promise<{ type: string }>;
  searchParams: Promise<{ period?: string }>;
}) {
  const { type } = await params;
  if (!isExpenseType(type)) notFound();

  const { period: periodParam } = await searchParams;
  const period: Period = periodParam === "week" ? "week" : "month";

  const reference = new Date();
  const expenses = await getAllExpenses();
  const filtered = expenses
    .filter((e) => e.type === type && isInPeriod(e.date, period, reference))
    .sort((a, b) => b.date.localeCompare(a.date));

  const totalCost = filtered.reduce((sum, e) => sum + e.cost, 0);

  return (
    <div className={styles.dashboard}>
      <div className={styles.topBar}>
        <div>
          <Link href="/expenses" className={styles.backLink}>
            <ArrowLeft size={14} strokeWidth={2} />
            All expenses
          </Link>
          <h1 className={styles.heading}>{EXPENSE_TYPE_LABEL[type]}</h1>
        </div>
        <div className={styles.toggleGroup}>
          {(["week", "month"] as const).map((p) => (
            <Link
              key={p}
              href={`/expenses/${type}?period=${p}`}
              className={`${styles.toggleButton} ${period === p ? styles.toggleButtonActive : ""}`}
            >
              {p === "week" ? "This Week" : "This Month"}
            </Link>
          ))}
        </div>
      </div>

      <div className={styles.summaryGrid}>
        <div className={styles.summaryCard}>
          <span className={styles.cardLabel}>TOTAL SPEND</span>
          <span className={styles.cardValue}>{formatCost(totalCost)}</span>
          <span className={styles.cardSub}>
            {filtered.length} {filtered.length === 1 ? "expense" : "expenses"} &middot; {periodLabel(period, reference)}
          </span>
        </div>
      </div>

      <div className={styles.sectionHeader}>
        <span className={styles.sectionTitle}>{EXPENSE_TYPE_LABEL[type].toUpperCase()} EXPENSES</span>
      </div>

      {filtered.length === 0 ? (
        <ul className={styles.expenseList}>
          <li className={styles.listEmpty}>No {EXPENSE_TYPE_LABEL[type].toLowerCase()} expenses for this period.</li>
        </ul>
      ) : (
        <ul className={styles.expenseList}>
          {filtered.map((expense) => (
            <li className={styles.expenseItem} key={expense.id}>
              <div className={styles.expenseMain}>
                <div className={styles.expenseTopLine}>
                  <span className={styles.expenseTitle}>{expense.title}</span>
                  <span className={styles.expenseDate}>{formatExpenseDate(expense.date)}</span>
                </div>
              </div>
              <div className={styles.expenseRowActions}>
                <span className={styles.expenseCost}>{formatCost(expense.cost)}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
