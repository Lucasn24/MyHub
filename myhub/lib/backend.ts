const BASE_URL = process.env.PYTHON_API_URL ?? "http://localhost:8000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Backend request failed: ${init?.method ?? "GET"} ${path} -> ${res.status} ${text}`);
  }
  return res.json();
}

export type InboxTask = {
  id: string;
  gmail_message_id: string;
  description: string;
  due_date: string | null;
  due_date_text: string | null;
  addressed_to_user: boolean;
  confirmed: boolean;
};

export type InboxEventTime = {
  start: string | null;
  end: string | null;
  time_text: string | null;
};

export type InboxEvent = {
  id: string;
  gmail_message_id: string;
  title: string;
  status: "proposed" | "confirmed" | "rescheduled" | "cancelled";
  location: string | null;
  attendees: string[];
  candidate_times: InboxEventTime[];
  confirmed: boolean;
};

export type InboxAttachment = { filename: string; size: number };

export type ExpenseType =
  | "groceries"
  | "dining"
  | "transport"
  | "travel"
  | "shopping"
  | "subscription"
  | "utilities"
  | "entertainment"
  | "health"
  | "housing"
  | "other";

export type EmbeddedExpense = {
  id: string;
  gmail_message_id: string;
  title: string;
  type: ExpenseType;
  cost: number;
  date: string;
};

export type InboxExpense = EmbeddedExpense & {
  emails: { subject: string; sender: string } | null;
};

export type InboxEmail = {
  id: string;
  gmail_message_id: string;
  subject: string;
  sender: string;
  snippet: string;
  body: string | null;
  links: string[];
  attachments: InboxAttachment[];
  received_at: string | null;
  category: string | null;
  tasks: InboxTask[];
  events: InboxEvent[];
  expenses: EmbeddedExpense[];
};

export async function getInboxEmails(limit = 100): Promise<InboxEmail[]> {
  const { emails } = await request<{ emails: InboxEmail[] }>(`/email/inbox?limit=${limit}`);
  return emails;
}

export async function getExpenses(limit = 200): Promise<InboxExpense[]> {
  const { expenses } = await request<{ expenses: InboxExpense[] }>(`/email/expenses?limit=${limit}`);
  return expenses;
}

export async function getKnownMessageIds(): Promise<Set<string>> {
  const { ids } = await request<{ ids: string[] }>("/email/known-ids");
  return new Set(ids);
}

export async function deleteEmail(gmailMessageId: string): Promise<void> {
  await request(`/email/${encodeURIComponent(gmailMessageId)}`, { method: "DELETE" });
}

export async function confirmTask(
  taskId: string,
  updates: { description: string; due_date: string | null; due_date_text: string | null }
): Promise<void> {
  await request(`/email/tasks/${encodeURIComponent(taskId)}/confirm`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  });
}

export async function confirmEvent(
  eventId: string,
  updates: {
    title: string;
    status: "proposed" | "confirmed" | "rescheduled" | "cancelled";
    location: string | null;
    start: string | null;
    end: string | null;
  }
): Promise<void> {
  await request(`/email/events/${encodeURIComponent(eventId)}/confirm`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  });
}

export type ProcessEmailPayload = {
  id: string;
  subject: string;
  sender: string;
  snippet: string;
  body: string;
  links: string[];
  attachments: InboxAttachment[];
  received_at: string | null;
};

export async function processEmail(payload: ProcessEmailPayload): Promise<void> {
  await request("/email/process", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
