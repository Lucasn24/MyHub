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
    -- Links found in the email body, and lightweight attachment metadata
    -- (filename/mimeType/size) -- no attachment bytes are stored here.
    links text[] not null default '{}',
    attachments jsonb not null default '[]',
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

-- Defensive: covers a live table that predates any of these columns, not just links/attachments.
alter table emails add column if not exists gmail_thread_id text;
alter table emails add column if not exists snippet text not null default '';
alter table emails add column if not exists body text;
alter table emails add column if not exists links text[] not null default '{}';
alter table emails add column if not exists attachments jsonb not null default '[]';
alter table emails add column if not exists received_at timestamptz;
alter table emails add column if not exists category text;
alter table emails add column if not exists categorized_at timestamptz not null default now();
-- Some live tables ended up with category NOT NULL, which breaks /process's
-- insert-then-categorize flow (the base row is written before category is known).
alter table emails alter column category drop not null;

create index if not exists emails_category_idx on emails (category);

create table if not exists tasks (
    id uuid primary key default gen_random_uuid(),
    gmail_message_id text not null references emails(gmail_message_id) on delete cascade,
    description text not null,
    due_date date,
    due_date_text text,
    addressed_to_user boolean not null default true,
    -- Stays false until the user reviews/edits and confirms it in the Emails UI popup.
    confirmed boolean not null default false,
    created_at timestamptz not null default now()
);

alter table tasks add column if not exists confirmed boolean not null default false;

create index if not exists tasks_gmail_message_id_idx on tasks (gmail_message_id);

create table if not exists events (
    id uuid primary key default gen_random_uuid(),
    gmail_message_id text not null references emails(gmail_message_id) on delete cascade,
    title text not null,
    -- The meeting's own real-world status, as extracted by the LLM -- distinct
    -- from `confirmed` below, which tracks whether the *user* has reviewed it.
    status text not null check (status in ('proposed', 'confirmed', 'rescheduled', 'cancelled')),
    location text,
    attendees text[] not null default '{}',
    candidate_times jsonb not null default '[]',
    confirmed boolean not null default false,
    created_at timestamptz not null default now()
);

alter table events add column if not exists confirmed boolean not null default false;

create index if not exists events_gmail_message_id_idx on events (gmail_message_id);

create table if not exists expenses (
    id uuid primary key default gen_random_uuid(),
    gmail_message_id text not null references emails(gmail_message_id) on delete cascade,
    title text not null,
    type text not null check (type in (
        'groceries', 'dining', 'transport', 'travel', 'shopping',
        'subscription', 'utilities', 'entertainment', 'health', 'housing', 'other'
    )),
    cost numeric not null,
    date date not null,
    created_at timestamptz not null default now()
);

create index if not exists expenses_gmail_message_id_idx on expenses (gmail_message_id);

-- Only the backend (service_role key, bypasses RLS) touches these tables for now.
-- RLS is enabled with no policies so an anon/authenticated key can't read or write them later by accident.
alter table emails enable row level security;
alter table tasks enable row level security;
alter table events enable row level security;
alter table expenses enable row level security;
