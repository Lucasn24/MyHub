import type { ExpenseType, InboxExpense } from "@/lib/backend";

export type Expense = {
  id: string;
  gmailMessageId: string;
  title: string;
  type: ExpenseType;
  cost: number;
  date: string;
  emailSubject: string | null;
  emailSender: string | null;
};

export const EXPENSE_TYPE_LABEL: Record<ExpenseType, string> = {
  groceries: "Groceries",
  dining: "Dining",
  transport: "Transport",
  travel: "Travel",
  shopping: "Shopping",
  subscription: "Subscription",
  utilities: "Utilities",
  entertainment: "Entertainment",
  health: "Health",
  housing: "Housing",
  other: "Other",
};

// Curated to sit alongside the app's warm-neutral background/black text instead
// of recharts' default saturated rainbow palette.
export const EXPENSE_TYPE_COLOR: Record<ExpenseType, string> = {
  groceries: "#6b8f71",
  dining: "#c17f59",
  transport: "#5b7c99",
  travel: "#8a6fae",
  shopping: "#c9a227",
  subscription: "#4a4a48",
  utilities: "#7a8a99",
  entertainment: "#b85c5c",
  health: "#5a9e8f",
  housing: "#9c7a54",
  other: "#a3a29c",
};

export type Period = "week" | "month";

function parseDateOnly(iso: string): Date {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function startOfWeek(reference: Date): Date {
  const d = new Date(reference.getFullYear(), reference.getMonth(), reference.getDate());
  const day = d.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + mondayOffset);
  return d;
}

export function isInPeriod(dateIso: string, period: Period, reference: Date): boolean {
  const date = parseDateOnly(dateIso);
  if (period === "month") {
    return date.getFullYear() === reference.getFullYear() && date.getMonth() === reference.getMonth();
  }
  const start = startOfWeek(reference);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return date >= start && date <= end;
}

export function periodLabel(period: Period, reference: Date): string {
  if (period === "month") {
    return reference.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  }
  const start = startOfWeek(reference);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const sameMonth = start.getMonth() === end.getMonth();
  const startLabel = start.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const endLabel = end.toLocaleDateString("en-US", {
    month: sameMonth ? undefined : "short",
    day: "numeric",
    year: "numeric",
  });
  return `${startLabel} – ${endLabel}`;
}

export function mapInboxExpense(e: InboxExpense): Expense {
  return {
    id: e.id,
    gmailMessageId: e.gmail_message_id,
    title: e.title,
    type: e.type,
    cost: Number(e.cost),
    date: e.date,
    emailSubject: e.emails?.subject ?? null,
    emailSender: e.emails?.sender ?? null,
  };
}

export function formatCost(cost: number): string {
  return cost.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export function formatExpenseDate(iso: string): string {
  // `date` columns come back as plain "YYYY-MM-DD" with no time/zone — parsing
  // that directly with `new Date()` would shift it a day in negative-UTC-offset
  // zones, so pull the parts out and build a local date explicitly.
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
