-- Run this in the Supabase dashboard: SQL Editor -> New query -> Run.
-- No DB password needed there, only your dashboard login.

create table if not exists emails (
    id uuid primary key default gen_random_uuid(),
    gmail_message_id text not null unique,
    gmail_thread_id text,
    subject text not null,
    sender text not null,
    snippet text not null,
    body text,
    received_at timestamptz,
    -- Nullable: /extract-tasks and /extract-events can create a base row before
    -- /categorize ever runs for that email, since the three endpoints are independent.
    category text check (category in (
        'urgent', 'action_required', 'meeting', 'acknowledgment',
        'newsletter', 'promotional', 'receipt', 'personal',
        'social', 'spam', 'other'
    )),
    categorized_at timestamptz not null default now()
);

create index if not exists emails_category_idx on emails (category);

create table if not exists tasks (
    id uuid primary key default gen_random_uuid(),
    gmail_message_id text not null references emails(gmail_message_id) on delete cascade,
    description text not null,
    due_date date,
    due_date_text text,
    addressed_to_user boolean not null default true,
    created_at timestamptz not null default now()
);

create index if not exists tasks_gmail_message_id_idx on tasks (gmail_message_id);

create table if not exists events (
    id uuid primary key default gen_random_uuid(),
    gmail_message_id text not null references emails(gmail_message_id) on delete cascade,
    title text not null,
    status text not null check (status in ('proposed', 'confirmed', 'rescheduled', 'cancelled')),
    location text,
    attendees text[] not null default '{}',
    candidate_times jsonb not null default '[]',
    created_at timestamptz not null default now()
);

create index if not exists events_gmail_message_id_idx on events (gmail_message_id);

-- Only the backend (service_role key, bypasses RLS) touches these tables for now.
-- RLS is enabled with no policies so an anon/authenticated key can't read or write them later by accident.
alter table emails enable row level security;
alter table tasks enable row level security;
alter table events enable row level security;
