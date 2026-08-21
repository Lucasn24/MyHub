"use client";

import { useState } from "react";
import { Check, ExternalLink, Loader2, Mail } from "lucide-react";
import sharedStyles from "../page.module.css";
import styles from "./page.module.css";
import type { SenderCluster } from "@/lib/google/gmail";

type Status = "idle" | "loading" | "done" | "error";

export default function SubscriptionList({ clusters }: { clusters: SenderCluster[] }) {
  const [statuses, setStatuses] = useState<Record<string, Status>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const runUnsubscribe = async (sender: string, method: "one-click" | "mailto", value: string) => {
    setStatuses((prev) => ({ ...prev, [sender]: "loading" }));
    try {
      const res = await fetch("/api/emails/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(method === "one-click" ? { method, url: value } : { method, mailto: value }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Failed to unsubscribe");
      setStatuses((prev) => ({ ...prev, [sender]: "done" }));
    } catch (err) {
      setStatuses((prev) => ({ ...prev, [sender]: "error" }));
      setErrors((prev) => ({
        ...prev,
        [sender]: err instanceof Error ? err.message : "Failed to unsubscribe",
      }));
    }
  };

  if (clusters.length === 0) {
    return (
      <ul className={sharedStyles.emailList}>
        <li className={sharedStyles.listEmpty}>No promotional or newsletter senders found.</li>
      </ul>
    );
  }

  return (
    <ul className={sharedStyles.emailList}>
      {clusters.map((c) => {
        const status = statuses[c.sender] ?? "idle";
        return (
          <li className={styles.senderRow} key={c.sender}>
            <div className={styles.senderInfo}>
              <div className={styles.senderName}>{c.displayName}</div>
              <div className={styles.senderEmail}>{c.sender}</div>
            </div>
            <span className={styles.countBadge}>{c.count}</span>
            <div className={styles.actionCol}>
              {status === "done" ? (
                <span className={styles.doneBadge}>
                  <Check size={12} strokeWidth={2} />
                  Unsubscribed
                </span>
              ) : c.oneClick && c.unsubscribeUrl ? (
                <button
                  type="button"
                  className={styles.unsubscribeButton}
                  disabled={status === "loading"}
                  onClick={() => runUnsubscribe(c.sender, "one-click", c.unsubscribeUrl!)}
                >
                  {status === "loading" && <Loader2 size={12} strokeWidth={2} className={styles.spin} />}
                  {status === "loading" ? "Unsubscribing…" : "Unsubscribe"}
                </button>
              ) : c.unsubscribeMailto ? (
                <button
                  type="button"
                  className={styles.unsubscribeButton}
                  disabled={status === "loading"}
                  onClick={() => runUnsubscribe(c.sender, "mailto", c.unsubscribeMailto!)}
                >
                  {status === "loading" ? (
                    <Loader2 size={12} strokeWidth={2} className={styles.spin} />
                  ) : (
                    <Mail size={12} strokeWidth={2} />
                  )}
                  {status === "loading" ? "Sending…" : "Unsubscribe by email"}
                </button>
              ) : c.unsubscribeUrl ? (
                <a
                  href={c.unsubscribeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.openLinkButton}
                >
                  <ExternalLink size={12} strokeWidth={2} />
                  Open unsubscribe page
                </a>
              ) : (
                <span className={styles.noMethod}>No unsubscribe link found</span>
              )}
              {status === "error" && <span className={styles.errorText}>{errors[c.sender]}</span>}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
