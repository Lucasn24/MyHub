export type EmailCategory =
  | "urgent"
  | "action_required"
  | "meeting"
  | "acknowledgment"
  | "receipt"
  | "personal"
  | "newsletter"
  | "social"
  | "promotional"
  | "spam"
  | "other";

export type ActionDetail = {
  kind: "task";
  id: string;
  description: string;
  dueDate: string;
  confirmed: boolean;
};

export type EventDetail = {
  kind: "event";
  id: string;
  title: string;
  status: "proposed" | "confirmed" | "rescheduled" | "cancelled";
  location: string;
  start: string;
  end: string;
  confirmed: boolean;
};

export type HighlightDetail = ActionDetail | EventDetail;

export type EmailAttachment = {
  filename: string;
  size: number;
};

export type Email = {
  id: string; // gmail_message_id
  subject: string;
  sender: string;
  snippet: string;
  body: string;
  category: EmailCategory;
  received: string;
  links: string[];
  attachments: EmailAttachment[];
  tasks: ActionDetail[];
  events: EventDetail[];
};

export const CATEGORY_LABEL: Record<EmailCategory, string> = {
  urgent: "Urgent",
  action_required: "Action Required",
  meeting: "Meeting",
  acknowledgment: "Acknowledgment",
  receipt: "Receipt",
  personal: "Personal",
  newsletter: "Newsletter",
  social: "Social",
  promotional: "Promotional",
  spam: "Spam",
  other: "Other",
};

export function formatRelativeReceived(iso: string | null): string {
  if (!iso) return "";
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diffMs / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}
