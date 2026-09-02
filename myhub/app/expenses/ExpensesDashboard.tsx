"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BarChart3, PieChart as PieChartIcon } from "lucide-react";
import {
  Bar,
  BarChart,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import styles from "./page.module.css";
import ExpenseRow from "./ExpenseRow";
import {
  EXPENSE_TYPE_COLOR,
  EXPENSE_TYPE_LABEL,
  formatCost,
  formatRelativeTime,
  isInPeriod,
  periodLabel,
  type Expense,
  type Period,
} from "./data";
import type { ExpenseType } from "@/lib/backend";

const RECENT_COUNT = 6;

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

type ChartMode = "pie" | "bar";

type TypeTotal = {
  type: ExpenseType;
  label: string;
  cost: number;
  count: number;
  color: string;
};

export default function ExpensesDashboard({ expenses }: { expenses: Expense[] }) {
  const router = useRouter();
  const [period, setPeriod] = useState<Period>("month");
  const [chartMode, setChartMode] = useState<ChartMode>("pie");
  const [items, setItems] = useResyncedState(expenses);

  const handleSaved = (updated: Expense) => {
    setItems((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
    router.refresh();
  };

  const reference = new Date();
  const periodExpenses = items.filter((e) => isInPeriod(e.date, period, reference));

  const recent = [...items]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, RECENT_COUNT);

  const totalsByType = new Map<ExpenseType, { cost: number; count: number }>();
  for (const expense of periodExpenses) {
    const existing = totalsByType.get(expense.type) ?? { cost: 0, count: 0 };
    existing.cost += expense.cost;
    existing.count += 1;
    totalsByType.set(expense.type, existing);
  }

  // Every type gets a card, even with $0/0 for this period — only the chart
  // (below) drops zero-value types, since an empty pie slice isn't meaningful.
  const cards: TypeTotal[] = (Object.keys(EXPENSE_TYPE_LABEL) as ExpenseType[])
    .map((type) => {
      const { cost, count } = totalsByType.get(type) ?? { cost: 0, count: 0 };
      return { type, label: EXPENSE_TYPE_LABEL[type], cost, count, color: EXPENSE_TYPE_COLOR[type] };
    })
    .sort((a, b) => b.cost - a.cost);

  const chartData = cards.filter((card) => card.cost > 0);

  const totalCost = periodExpenses.reduce((sum, e) => sum + e.cost, 0);

  return (
    <>
      <div className={styles.controlsRow}>
        <div className={styles.toggleGroup}>
          {(["week", "month"] as const).map((p) => (
            <button
              key={p}
              type="button"
              className={`${styles.toggleButton} ${period === p ? styles.toggleButtonActive : ""}`}
              onClick={() => setPeriod(p)}
            >
              {p === "week" ? "This Week" : "This Month"}
            </button>
          ))}
        </div>

        <div className={styles.toggleGroup}>
          <button
            type="button"
            className={`${styles.toggleButton} ${chartMode === "pie" ? styles.toggleButtonActive : ""}`}
            onClick={() => setChartMode("pie")}
            aria-label="Show pie chart"
          >
            <PieChartIcon size={14} strokeWidth={2} />
            Pie
          </button>
          <button
            type="button"
            className={`${styles.toggleButton} ${chartMode === "bar" ? styles.toggleButtonActive : ""}`}
            onClick={() => setChartMode("bar")}
            aria-label="Show bar chart"
          >
            <BarChart3 size={14} strokeWidth={2} />
            Bar
          </button>
        </div>
      </div>

      <div className={styles.content}>
        <section>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionTitle}>SPENDING BY CATEGORY</span>
            <span className={styles.runningCount}>{periodLabel(period, reference)}</span>
          </div>

          <div className={styles.typeGrid}>
            {cards.map((card) => (
              <Link
                key={card.type}
                href={`/expenses/${card.type}?period=${period}`}
                className={`${styles.typeCard} ${card.cost === 0 ? styles.typeCardEmpty : ""}`}
              >
                <span className={styles.typeCardSwatch} style={{ backgroundColor: card.color }} />
                <span className={styles.cardLabel}>{card.label.toUpperCase()}</span>
                <span className={styles.cardValue}>{formatCost(card.cost)}</span>
                <span className={styles.cardSub}>
                  {card.count} {card.count === 1 ? "expense" : "expenses"}
                </span>
              </Link>
            ))}
          </div>
        </section>

        <aside className={styles.sidePanel}>
          <div className={styles.summaryGrid}>
            <div className={styles.summaryCard}>
              <span className={styles.cardLabel}>TOTAL SPEND</span>
              <span className={styles.cardValue}>{formatCost(totalCost)}</span>
              <span className={styles.cardSub}>{periodLabel(period, reference)}</span>
            </div>
          </div>

          <div className={styles.chartCard}>
            {chartData.length === 0 ? (
              <p className={styles.listEmpty}>Nothing to chart yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                {chartMode === "pie" ? (
                  <PieChart>
                    <Pie
                      data={chartData}
                      dataKey="cost"
                      nameKey="label"
                      innerRadius={55}
                      outerRadius={90}
                      paddingAngle={2}
                    >
                      {chartData.map((card) => (
                        <Cell key={card.type} fill={card.color} stroke="none" />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatCost(Number(value))} />
                    <Legend
                      layout="vertical"
                      verticalAlign="middle"
                      align="right"
                      wrapperStyle={{ fontSize: 12 }}
                    />
                  </PieChart>
                ) : (
                  <BarChart data={chartData} layout="vertical" margin={{ left: 16, right: 16 }}>
                    <XAxis type="number" hide />
                    <YAxis
                      type="category"
                      dataKey="label"
                      width={90}
                      tick={{ fontSize: 12, fill: "currentColor" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip formatter={(value) => formatCost(Number(value))} cursor={{ fill: "rgba(148, 148, 140, 0.18)" }} />
                    <Bar dataKey="cost" radius={[0, 6, 6, 0]}>
                      {chartData.map((card) => (
                        <Cell key={card.type} fill={card.color} />
                      ))}
                    </Bar>
                  </BarChart>
                )}
              </ResponsiveContainer>
            )}
          </div>

          <div className={styles.sectionHeader}>
            <span className={styles.sectionTitle}>RECENTLY ADDED</span>
          </div>

          {recent.length === 0 ? (
            <ul className={styles.recentPanel}>
              <li className={styles.listEmpty}>Nothing added yet.</li>
            </ul>
          ) : (
            <ul className={styles.recentPanel}>
              {recent.map((expense) => (
                <ExpenseRow
                  key={expense.id}
                  expense={expense}
                  subtitle={formatRelativeTime(expense.createdAt)}
                  onSaved={handleSaved}
                />
              ))}
            </ul>
          )}
        </aside>
      </div>
    </>
  );
}
