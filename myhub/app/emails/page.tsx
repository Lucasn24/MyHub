import Link from "next/link";
import styles from "./page.module.css";
import { CATEGORY_LABEL, formatRelativeReceived, type ActionDetail, type Email, type EmailCategory, type EventDetail } from "./data";
import EmailPanel from "./EmailPanel";
import { getInboxEmails, type InboxEmail } from "@/lib/backend";
import { hasTokens } from "@/lib/google/tokenStore";

function toDatetimeLocal(iso: string | null): string {
  return iso ? iso.slice(0, 16) : "";
}

function mapCategory(raw: string | null): EmailCategory {
  return raw && raw in CATEGORY_LABEL ? (raw as EmailCategory) : "other";
}

function mapInboxEmail(e: InboxEmail): Email {
  const tasks: ActionDetail[] = e.tasks.map((t) => ({
    kind: "task",
    id: t.id,
    description: t.description,
    dueDate: t.due_date ?? "",
    confirmed: t.confirmed,
  }));

  const events: EventDetail[] = e.events.map((ev) => {
    const first = ev.candidate_times[0];
    return {
      kind: "event",
      id: ev.id,
      title: ev.title,
      status: ev.status,
      location: ev.location ?? "",
      start: toDatetimeLocal(first?.start ?? null),
      end: toDatetimeLocal(first?.end ?? null),
      confirmed: ev.confirmed,
    };
  });

  return {
    id: e.gmail_message_id,
    subject: e.subject,
    sender: e.sender,
    snippet: e.snippet,
    body: e.body ?? "",
    category: mapCategory(e.category),
    received: formatRelativeReceived(e.received_at),
    links: e.links,
    attachments: e.attachments,
    tasks,
    events,
  };
}

async function getEmails(): Promise<Email[]> {
  if (!hasTokens()) return [];
  try {
    const inbox = await getInboxEmails();
    return inbox.map(mapInboxEmail);
  } catch (err) {
    console.error("Failed to load inbox emails from backend:", err);
    return [];
  }
}

function buildFilters(list: Email[]) {
  const counts = new Map<EmailCategory, number>();
  for (const email of list) {
    counts.set(email.category, (counts.get(email.category) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

export default async function Emails({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;
  const activeCategory = category && category in CATEGORY_LABEL ? (category as EmailCategory) : null;

  const connected = hasTokens();
  const emails = await getEmails();

  const filtered = activeCategory ? emails.filter((e) => e.category === activeCategory) : emails;
  const filters = buildFilters(emails);

  const pendingTasks = emails.flatMap((email) =>
    email.tasks.filter((t) => !t.confirmed).map((task) => ({ email, task }))
  );
  const pendingEvents = emails.flatMap((email) =>
    email.events.filter((ev) => !ev.confirmed).map((event) => ({ email, event }))
  );
  const attentionItems = [
    ...pendingTasks.map(({ email, task }) => ({
      key: `task-${task.id}`,
      subject: email.subject,
      detail: `Action: ${task.description}${task.dueDate ? ` — due ${task.dueDate}` : ""}`,
    })),
    ...pendingEvents.map(({ email, event }) => ({
      key: `event-${event.id}`,
      subject: email.subject,
      detail: `Event: ${event.title}`,
    })),
  ].slice(0, 3);

  return (
    <div className={styles.dashboard}>
      <div className={styles.topBar}>
        <div>
          <span className={styles.statusBadge}>INBOX &middot; {emails.length} SYNCED</span>
          <h1 className={styles.heading}>Your inbox, sorted.</h1>
        </div>
        <Link href="/emails/unsubscribe" className={styles.syncButton}>
          Unsubscribe assistant
        </Link>
      </div>

      {!connected ? (
        <div className={styles.connectPrompt}>
          <span className={styles.connectText}>
            Connect your Google account so new unread mail can sync into this inbox.
          </span>
          <a className={styles.syncButton} href="/api/google/connect">
            Connect Google
          </a>
        </div>
      ) : (
        <>
          <div className={styles.filterRow}>
            <Link
              href="/emails"
              className={`${styles.filterPill} ${!activeCategory ? styles.filterPillActive : ""}`}
            >
              All
              <span className={styles.filterCount}>{emails.length}</span>
            </Link>
            {filters.map(([cat, count]) => (
              <Link
                key={cat}
                href={`/emails?category=${cat}`}
                className={`${styles.filterPill} ${activeCategory === cat ? styles.filterPillActive : ""}`}
              >
                {CATEGORY_LABEL[cat]}
                <span className={styles.filterCount}>{count}</span>
              </Link>
            ))}
          </div>

          <div className={styles.content}>
            <section>
              <EmailPanel
                emails={filtered}
                categoryLabel={CATEGORY_LABEL}
                sectionTitle={activeCategory ? CATEGORY_LABEL[activeCategory].toUpperCase() : "ALL MAIL"}
              />
            </section>

            <aside className={styles.sidePanel}>
              <div className={styles.sectionHeader}>
                <span className={styles.sectionTitle}>NEEDS ATTENTION</span>
              </div>

              <div className={styles.attentionGrid}>
                <div className={styles.automationCard}>
                  <span className={styles.cardLabel}>ACTION REQUIRED</span>
                  <span className={styles.cardValue}>{pendingTasks.length}</span>
                  <span className={styles.cardSub}>Open tasks from email</span>
                </div>
                <div className={styles.automationCard}>
                  <span className={styles.cardLabel}>MEETINGS</span>
                  <span className={styles.cardValue}>{pendingEvents.length}</span>
                  <span className={styles.cardSub}>Proposed or confirmed</span>
                </div>
              </div>

              <ul className={styles.actionList}>
                {attentionItems.length === 0 ? (
                  <li className={styles.listEmpty}>Nothing needs attention right now.</li>
                ) : (
                  attentionItems.map((item) => (
                    <li className={styles.actionItem} key={item.key}>
                      <div className={styles.expenseName}>{item.subject}</div>
                      <div className={styles.expenseSub}>{item.detail}</div>
                    </li>
                  ))
                )}
              </ul>

              <div className={styles.cleanupPrompt}>
                <span className={styles.connectText}>
                  Clear out newsletters and promotions clogging your inbox.
                </span>
                <Link href="/emails/unsubscribe" className={styles.viewAllButton}>
                  Review senders
                </Link>
              </div>
            </aside>
          </div>
        </>
      )}
    </div>
  );
}
