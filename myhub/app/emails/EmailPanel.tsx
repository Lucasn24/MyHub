"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ExternalLink, Mail, Paperclip } from "lucide-react";
import styles from "./page.module.css";
import type { CATEGORY_LABEL, Email, HighlightDetail } from "./data";
import ActionEventModal from "./ActionEventModal";

const ATTENTION_CATEGORIES = new Set<Email["category"]>(["urgent", "action_required", "meeting"]);
const MAX_COLLAPSED_LINKS = 2;

type ActiveDetail = { emailId: string; label: string; detail: HighlightDetail };

function formatLinkLabel(url: string): string {
  return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function gmailUrl(gmailMessageId: string): string {
  return `https://mail.google.com/mail/u/0/#all/${gmailMessageId}`;
}

function detailLabel(detail: HighlightDetail): string {
  if (detail.kind === "task") {
    return `Action: ${detail.description}${detail.dueDate ? ` — due ${detail.dueDate}` : ""}`;
  }
  return `Event: ${detail.title}`;
}

export default function EmailPanel({
  emails,
  categoryLabel,
  sectionTitle,
}: {
  emails: Email[];
  categoryLabel: typeof CATEGORY_LABEL;
  sectionTitle: string;
}) {
  const router = useRouter();
  const [localEmails, setLocalEmails] = useState(emails);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [activeDetail, setActiveDetail] = useState<ActiveDetail | null>(null);

  // Resync whenever the server gives us a fresh list (category nav, or after router.refresh()).
  const [prevEmails, setPrevEmails] = useState(emails);
  if (prevEmails !== emails) {
    setPrevEmails(emails);
    setLocalEmails(emails);
  }

  // The background sync poller pushes a "new-emails" event the moment it processes
  // unread mail; re-fetch the server component so the new messages show up live.
  useEffect(() => {
    const source = new EventSource("/api/emails/stream");
    source.addEventListener("new-emails", () => router.refresh());
    return () => source.close();
  }, [router]);

  const toggleChecked = (id: string) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const markAsRead = async (ids: string[]) => {
    if (ids.length === 0) return;
    setLocalEmails((prev) => prev.filter((email) => !ids.includes(email.id)));
    setCheckedIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.delete(id));
      return next;
    });
    try {
      await fetch("/api/emails/mark-read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gmail_message_ids: ids }),
      });
    } catch (err) {
      console.error("Failed to mark emails as read:", err);
    }
    router.refresh();
  };

  const confirmSelected = () => markAsRead([...checkedIds]);
  const markAllRead = () => markAsRead(localEmails.map((email) => email.id));

  const handleItemConfirmed = () => {
    if (!activeDetail) return;
    const { emailId, detail } = activeDetail;
    setLocalEmails((prev) =>
      prev.map((email) => {
        if (email.id !== emailId) return email;
        if (detail.kind === "task") {
          return {
            ...email,
            tasks: email.tasks.map((t) => (t.id === detail.id ? { ...t, confirmed: true } : t)),
          };
        }
        return {
          ...email,
          events: email.events.map((ev) => (ev.id === detail.id ? { ...ev, confirmed: true } : ev)),
        };
      })
    );
  };

  const selectedCount = checkedIds.size;

  return (
    <>
      <div className={styles.sectionHeader}>
        <span className={styles.sectionTitle}>{sectionTitle}</span>
        <div className={styles.headerRight}>
          <span className={styles.runningCount}>{localEmails.length} messages</span>
          <button
            type="button"
            className={styles.viewAllButton}
            disabled={localEmails.length === 0}
            onClick={markAllRead}
          >
            Mark all as read
          </button>
          {selectedCount > 0 && <span className={styles.selectedCount}>{selectedCount} selected</span>}
          <button
            type="button"
            className={styles.confirmButton}
            disabled={selectedCount === 0}
            onClick={confirmSelected}
          >
            Confirm
          </button>
        </div>
      </div>

      {localEmails.length === 0 ? (
        <ul className={styles.emailList}>
          <li className={styles.listEmpty}>No emails in this category.</li>
        </ul>
      ) : (
        <ul className={styles.emailList}>
          {localEmails.map((email) => {
            const expanded = expandedId === email.id;
            const isChecked = checkedIds.has(email.id);
            const items: HighlightDetail[] = [...email.tasks, ...email.events];
            return (
              <li
                className={styles.emailItem}
                key={email.id}
                onClick={() => setExpandedId(expanded ? null : email.id)}
              >
                <div className={styles.emailContainer}>
                  <div className={styles.selectCol} onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleChecked(email.id)}
                      aria-label={`Select ${email.subject}`}
                    />
                  </div>

                  <div className={styles.emailMain}>
                    <div className={styles.emailTopLine}>
                      <span className={styles.emailSubject}>{email.subject}</span>
                      {email.attachments.length > 0 && (
                        <Paperclip
                          size={13}
                          strokeWidth={2}
                          className={styles.attachmentIndicator}
                          aria-label="Has attachment"
                        />
                      )}
                      <span className={styles.emailReceived}>{email.received}</span>
                    </div>
                    <div className={styles.emailSender}>{email.sender}</div>
                    {expanded ? (
                      <div className={styles.emailBody}>{email.body}</div>
                    ) : (
                      <div className={styles.emailSnippet}>{email.snippet}</div>
                    )}
                    {email.links.length > 0 &&
                      (() => {
                        const visibleLinks = expanded ? email.links : email.links.slice(0, MAX_COLLAPSED_LINKS);
                        const hiddenCount = expanded ? 0 : email.links.length - visibleLinks.length;
                        return (
                          <div className={styles.chipRow} onClick={(e) => e.stopPropagation()}>
                            {visibleLinks.map((link) => (
                              <a
                                key={link}
                                href={link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={styles.linkChip}
                              >
                                <ExternalLink size={12} strokeWidth={2} />
                                <span className={styles.chipText}>{formatLinkLabel(link)}</span>
                              </a>
                            ))}
                            {hiddenCount > 0 && <span className={styles.moreChips}>+{hiddenCount} more</span>}
                          </div>
                        );
                      })()}
                    {expanded && email.attachments.length > 0 && (
                      <div className={styles.extrasGroup} onClick={(e) => e.stopPropagation()}>
                        <span className={styles.extrasLabel}>Documents</span>
                        <div className={styles.chipRow}>
                          {email.attachments.map((att) => (
                            <span key={att.filename} className={styles.attachmentChip}>
                              <Paperclip size={12} strokeWidth={2} />
                              <span className={styles.chipText}>{att.filename}</span>
                              <span className={styles.chipMeta}>{formatBytes(att.size)}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {items.length > 0 && (
                      <div className={styles.chipRow} onClick={(e) => e.stopPropagation()}>
                        {items.map((detail) =>
                          detail.confirmed ? (
                            <span key={detail.id} className={styles.confirmedBadge}>
                              <Check size={12} strokeWidth={2} />
                              {detailLabel(detail)}
                            </span>
                          ) : (
                            <button
                              key={detail.id}
                              type="button"
                              className={styles.actionButton}
                              onClick={() =>
                                setActiveDetail({ emailId: email.id, label: detailLabel(detail), detail })
                              }
                            >
                              {detailLabel(detail)}
                            </button>
                          )
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className={styles.rowActions} onClick={(e) => e.stopPropagation()}>
                  <span
                    className={`${styles.categoryBadge} ${
                      ATTENTION_CATEGORIES.has(email.category) ? styles.categoryBadgeFilled : ""
                    }`}
                  >
                    {categoryLabel[email.category]}
                  </span>
                  <a
                    href={gmailUrl(email.id)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.gmailLink}
                  >
                    <Mail size={12} strokeWidth={2} />
                    View in Gmail
                  </a>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {activeDetail && (
        <ActionEventModal
          key={activeDetail.detail.id}
          label={activeDetail.label}
          detail={activeDetail.detail}
          onClose={() => setActiveDetail(null)}
          onConfirmed={handleItemConfirmed}
        />
      )}
    </>
  );
}
