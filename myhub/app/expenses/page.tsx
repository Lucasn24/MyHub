import Link from "next/link";
import styles from "./page.module.css";
import ExpensesDashboard from "./ExpensesDashboard";
import { mapInboxExpense, type Expense } from "./data";
import { getExpenses } from "@/lib/backend";
import { hasTokens } from "@/lib/google/tokenStore";

async function getAllExpenses(): Promise<Expense[]> {
  if (!hasTokens()) return [];
  try {
    const expenses = await getExpenses();
    return expenses.map(mapInboxExpense);
  } catch (err) {
    console.error("Failed to load expenses from backend:", err);
    return [];
  }
}

export default async function Expenses() {
  const connected = hasTokens();
  const expenses = await getAllExpenses();

  return (
    <div className={styles.dashboard}>
      <div className={styles.topBar}>
        <div>
          <span className={styles.statusBadge}>EXPENSES &middot; {expenses.length} TRACKED</span>
          <h1 className={styles.heading}>What you&apos;ve spent.</h1>
        </div>
        <Link href="/emails?category=receipt" className={styles.syncButton}>
          View source receipts
        </Link>
      </div>

      {!connected ? (
        <div className={styles.connectPrompt}>
          <span className={styles.connectText}>
            Connect your Google account so receipts synced from your inbox can be tracked here.
          </span>
          <a className={styles.syncButton} href="/api/google/connect">
            Connect Google
          </a>
        </div>
      ) : (
        <ExpensesDashboard expenses={expenses} />
      )}
    </div>
  );
}
