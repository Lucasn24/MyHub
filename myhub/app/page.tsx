import Link from "next/link";
import styles from "./page.module.css";
import { hasTokens } from "@/lib/google/tokenStore";
import { listRecentMessages } from "@/lib/google/gmail";
import { listUpcomingEvents } from "@/lib/google/calendar";

const automations = [
  { title: "Email Processor", value: "1,242", sub: "Items sorted this week" },
  { title: "Invoice Match", value: "88%", sub: "Confidence score avg." },
  { title: "Cloud Sync", value: "14.2 GB", sub: "Encrypted today" },
  { title: "Thread Cleaner", value: "12h", sub: "Uptime since last idle" },
];

const expenses = [
  { name: "OpenAI API", sub: "Workflow logic tier", amount: "$142.00" },
  { name: "Vercel Hosting", sub: "Dashboard frontend", amount: "$20.00" },
  { name: "Postmark", sub: "Automation relay", amount: "$15.00" },
  { name: "Supabase", sub: "Pro database plan", amount: "$25.00" },
];

async function getGoogleData() {
  if (!hasTokens()) return null;

  try {
    const [emails, events] = await Promise.all([listRecentMessages(4), listUpcomingEvents(4)]);
    return { emails, events };
  } catch {
    return { emails: [], events: [], error: true };
  }
}

export default async function Home() {
  const google = await getGoogleData();

  return (
    <div className={styles.dashboard}>
      <div className={styles.topBar}>
        <div>
          <span className={styles.statusBadge}>SYSTEM: OPERATIONAL</span>
          <h1 className={styles.heading}>Everything is moving.</h1>
        </div>
        <button className={styles.syncButton}>Sync All Flows</button>
      </div>

      <div className={styles.content}>
        <section>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionTitle}>ACTIVE AUTOMATIONS</span>
            <span className={styles.runningCount}>4 Running</span>
          </div>
          <div className={styles.automationsGrid}>
            {automations.map(({ title, value, sub }) => (
              <div className={styles.automationCard} key={title}>
                <span className={styles.cardLabel}>{title.toUpperCase()}</span>
                <span className={styles.cardValue}>{value}</span>
                <span className={styles.cardSub}>{sub}</span>
              </div>
            ))}
          </div>
        </section>

        <aside className={styles.expensesPanel}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionTitle}>MONTHLY EXPENSES</span>
            <Link 
              href="/expenses"
              className={styles.viewAllButton}
            >
              View All
            </Link>
          </div>
          <ul className={styles.expensesList}>
            {expenses.map(({ name, sub, amount }) => (
              <li className={styles.expenseItem} key={name}>
                <div>
                  <div className={styles.expenseName}>{name}</div>
                  <div className={styles.expenseSub}>{sub}</div>
                </div>
                <div className={styles.expenseAmount}>{amount}</div>
              </li>
            ))}
          </ul>
          <div className={styles.totalBurn}>
            <span className={styles.totalBurnLabel}>TOTAL BURN</span>
            <span className={styles.totalBurnValue}>$202.00</span>
            <span className={styles.totalBurnSub}>Projected: +4% from last month</span>
          </div>
        </aside>
      </div>

      <section>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTitle}>GOOGLE</span>
        </div>

        {!google ? (
          <div className={styles.connectPrompt}>
            <span className={styles.connectText}>
              Connect your Google account to see recent emails and upcoming events here.
            </span>
            <a className={styles.syncButton} href="/api/google/connect">
              Connect Google
            </a>
          </div>
        ) : (
          <div className={styles.googleGrid}>
            <div className={styles.googlePanel}>
              <div className={styles.googlePanelTitle}>RECENT EMAILS</div>
              {google.emails.length === 0 ? (
                <div className={styles.listEmpty}>No recent emails.</div>
              ) : (
                google.emails.map((email) => (
                  <div className={styles.listItem} key={email.id}>
                    <div className={styles.listPrimary}>{email.subject}</div>
                    <div className={styles.listSecondary}>{email.from}</div>
                  </div>
                ))
              )}
            </div>

            <div className={styles.googlePanel}>
              <div className={styles.googlePanelTitle}>UPCOMING EVENTS</div>
              {google.events.length === 0 ? (
                <div className={styles.listEmpty}>No upcoming events.</div>
              ) : (
                google.events.map((event) => (
                  <div className={styles.listItem} key={event.id}>
                    <div className={styles.listPrimary}>{event.summary}</div>
                    <div className={styles.listSecondary}>{event.start}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
