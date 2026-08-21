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
    category text not null check (category in (
        'urgent', 'action_required', 'meeting', 'acknowledgment',
        'newsletter', 'promotional', 'receipt', 'personal',
        'social', 'spam', 'other'
    )),
    categorized_at timestamptz not null default now()
);

create index if not exists emails_category_idx on emails (category);

-- Only the backend (service_role key, bypasses RLS) touches this table for now.
-- RLS is enabled with no policies so an anon/authenticated key can't read or write it later by accident.
alter table emails enable row level security;
