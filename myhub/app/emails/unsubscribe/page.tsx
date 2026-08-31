import Link from "next/link";
import styles from "../page.module.css";
import { hasTokens } from "@/lib/google/tokenStore";
import { findUnsubscribeCandidates, type SenderCluster } from "@/lib/google/gmail";
import SubscriptionList from "./SubscriptionList";

async function getClusters(): Promise<SenderCluster[] | null> {
  if (!(await hasTokens())) return null;
  try {
    return await findUnsubscribeCandidates(50);
  } catch (err) {
    console.error("Failed to scan inbox for subscriptions:", err);
    return [];
  }
}

export default async function UnsubscribePage() {
  const clusters = await getClusters();
  const connected = clusters !== null;

  return (
    <div className={styles.dashboard}>
      <div className={styles.topBar}>
        <div>
          <span className={styles.statusBadge}>
            {connected ? `${clusters.length} SENDERS FOUND` : "NOT CONNECTED"}
          </span>
          <h1 className={styles.heading}>Unsubscribe assistant</h1>
        </div>
        <Link href="/emails" className={styles.viewAllButton}>
          Back to inbox
        </Link>
      </div>

      {!connected ? (
        <div className={styles.connectPrompt}>
          <span className={styles.connectText}>
            Connect your Google account to scan your inbox for subscriptions.
          </span>
          <a className={styles.syncButton} href="/api/google/connect">
            Connect Google
          </a>
        </div>
      ) : (
        <SubscriptionList clusters={clusters} />
      )}
    </div>
  );
}
