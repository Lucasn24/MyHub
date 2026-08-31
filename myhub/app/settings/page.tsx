import styles from "../page.module.css";
import { hasTokens } from "@/lib/google/tokenStore";

export default async function Settings() {
  const connected = await hasTokens();

  return (
    <div className={styles.dashboard}>
      <div className={styles.topBar}>
        <div>
          <span className={styles.statusBadge}>SETTINGS</span>
          <h1 className={styles.heading}>Account & connections.</h1>
        </div>
      </div>

      <section>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTitle}>GOOGLE ACCOUNT</span>
        </div>
        {connected ? (
          <div className={styles.connectPrompt}>
            <span className={styles.connectText}>Connected — Gmail and Calendar access is active.</span>
            <a className={styles.syncButton} href="/api/google/connect">
              Reconnect
            </a>
          </div>
        ) : (
          <div className={styles.connectPrompt}>
            <span className={styles.connectText}>Not connected — connect your Google account to sync Gmail and Calendar.</span>
            <a className={styles.syncButton} href="/api/google/connect">
              Connect Google
            </a>
          </div>
        )}
      </section>

      <section>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTitle}>SESSION</span>
        </div>
        <div className={styles.connectPrompt}>
          <span className={styles.connectText}>Signed in to this browser.</span>
          <form action="/api/auth/logout" method="POST">
            <button className={styles.syncButton} type="submit">
              Log out
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
