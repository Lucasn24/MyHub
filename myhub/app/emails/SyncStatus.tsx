"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, RefreshCw } from "lucide-react";
import styles from "./page.module.css";

type SyncState = {
  state: "idle" | "error";
  error?: string;
  lastSyncedAt?: number;
  lastAttemptAt?: number;
};

export default function SyncStatus() {
  const router = useRouter();
  const [status, setStatus] = useState<SyncState>({ state: "idle" });
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const source = new EventSource("/api/emails/stream");
    source.addEventListener("sync-status", (event) => {
      setStatus(JSON.parse((event as MessageEvent).data));
    });
    return () => source.close();
  }, []);

  const runSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch("/api/emails/sync", { method: "POST" });
      setStatus(await res.json());
      router.refresh();
    } catch (err) {
      console.error("Manual sync failed:", err);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className={styles.syncStatusRow}>
      {status.state === "error" && (
        <span className={styles.syncErrorBadge}>
          <AlertTriangle size={13} strokeWidth={2} />
          Sync failed{status.error ? `: ${status.error}` : ""}
        </span>
      )}
      <button type="button" className={styles.syncButton} onClick={runSync} disabled={syncing}>
        <RefreshCw size={13} strokeWidth={2} className={syncing ? styles.spinIcon : undefined} />
        {syncing ? "Syncing…" : "Sync now"}
      </button>
    </div>
  );
}
