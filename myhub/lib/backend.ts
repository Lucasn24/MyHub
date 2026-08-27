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

// Tasks page (personal planner) -- distinct from the email-derived InboxTask/
// InboxEvent above, which come from parsing inbox messages, not this page's UI.

export type PlannerRepeatRow = {
  freq: "daily" | "custom";
  daysOfWeek?: number[];
  endDate?: string;
};

export type PlannerTaskRow = {
  id: string;
  title: string;
  notes: string | null;
  due_date: string | null;
  due_time: string | null;
  tag_id: string | null;
  event_id: string | null;
  completed_dates: string[];
  created_at: string;
};

export type PlannerBlockRow = {
  id: string;
  title: string;
  notes: string | null;
  date: string;
  start_time: string;
  end_time: string;
  tag_id: string | null;
  repeat: PlannerRepeatRow | null;
  pushed_to_google: boolean;
  google_event_id: string | null;
  created_at: string;
};

export type PlannerTagRow = {
  id: string;
  label: string;
  created_at: string;
};

export type PlannerState = {
  tasks: PlannerTaskRow[];
  blocks: PlannerBlockRow[];
  tags: PlannerTagRow[];
};

export async function getPlannerState(): Promise<PlannerState> {
  return request<PlannerState>("/planner/state");
}

export async function createPlannerTask(row: Omit<PlannerTaskRow, "created_at">): Promise<PlannerTaskRow> {
  return request<PlannerTaskRow>("/planner/tasks", { method: "POST", body: JSON.stringify(row) });
}

export async function updatePlannerTask(
  id: string,
  updates: Partial<Omit<PlannerTaskRow, "id" | "created_at">>
): Promise<PlannerTaskRow> {
  return request<PlannerTaskRow>(`/planner/tasks/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  });
}

export async function deletePlannerTask(id: string): Promise<void> {
  await request(`/planner/tasks/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export async function createPlannerBlock(row: Omit<PlannerBlockRow, "created_at">): Promise<PlannerBlockRow> {
  return request<PlannerBlockRow>("/planner/blocks", { method: "POST", body: JSON.stringify(row) });
}

export async function updatePlannerBlock(
  id: string,
  updates: Partial<Omit<PlannerBlockRow, "id" | "created_at">>
): Promise<PlannerBlockRow> {
  return request<PlannerBlockRow>(`/planner/blocks/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  });
}

export async function deletePlannerBlock(id: string): Promise<void> {
  await request(`/planner/blocks/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export async function createPlannerTag(row: Omit<PlannerTagRow, "created_at">): Promise<PlannerTagRow> {
  return request<PlannerTagRow>("/planner/tags", { method: "POST", body: JSON.stringify(row) });
}

export async function updatePlannerTag(id: string, updates: { label: string }): Promise<PlannerTagRow> {
  return request<PlannerTagRow>(`/planner/tags/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  });
}

export async function deletePlannerTag(id: string): Promise<void> {
  await request(`/planner/tags/${encodeURIComponent(id)}`, { method: "DELETE" });
}
