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

-- Tasks page (personal planner) tables -- distinct from the email-derived
-- `tasks`/`events` above, which come from parsing inbox messages, not the
-- Tasks page UI. Prefixed `planner_` to avoid colliding with those.
--
-- `planner_tags` is the single categorization entity for the Tasks page.
-- Earlier iterations had two separate concepts here -- a free-form colored
-- "tag" (Work/Personal/Urgent) and a goal-tracking "goal" -- which have been
-- collapsed into one. The migration block below folds an existing install's
-- data into this shape; it's a no-op on a fresh database.

-- Migration: fold the old planner_tags (Work/Personal/Urgent) + planner_goals
-- into a single planner_tags table (planner_goals wins the name and the data;
-- the old planner_tags is dropped). Gated on planner_goals still existing, so
-- this whole block is a no-op once already applied (or on a fresh database).
do $$
begin
  if to_regclass('public.planner_goals') is not null then
    drop table if exists planner_tags cascade;
    alter table planner_goals rename to planner_tags;
  end if;
end $$;

-- Migration: planner_tasks/planner_blocks columns -- rename goal_id to
-- tag_id, drop the old tag_ids array and (tasks-only) repeat, add
-- planner_tasks.event_id, drop planner_blocks.task_id (tasks are no longer
-- schedulable as blocks -- see planner_tasks.event_id instead, which links a
-- task to an existing event for organization without putting the task on
-- the timetable itself). Each step is independently guarded, so re-running
-- this file is safe.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_name = 'planner_tasks' and column_name = 'goal_id'
  ) then
    alter table planner_tasks rename column goal_id to tag_id;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_name = 'planner_blocks' and column_name = 'goal_id'
  ) then
    alter table planner_blocks rename column goal_id to tag_id;
  end if;
end $$;

alter table if exists planner_tasks drop column if exists tag_ids;
alter table if exists planner_tasks drop column if exists repeat;
alter table if exists planner_tasks
    add column if not exists event_id uuid references planner_blocks(id) on delete set null;
alter table if exists planner_blocks drop column if exists tag_ids;
alter table if exists planner_blocks drop column if exists task_id;

drop index if exists planner_tasks_goal_id_idx;
drop index if exists planner_blocks_goal_id_idx;

-- Desired end-state shape (also what a fresh database gets):

create table if not exists planner_tags (
    id uuid primary key default gen_random_uuid(),
    label text not null,
    created_at timestamptz not null default now()
);

create table if not exists planner_blocks (
    id uuid primary key default gen_random_uuid(),
    title text not null,
    notes text,
    date date not null,
    start_time text not null,
    end_time text not null,
    tag_id uuid references planner_tags(id) on delete set null,
    -- {freq: "daily"|"custom", daysOfWeek: number[]|null, endDate: string|null},
    -- kept as-is from the frontend's RepeatRule type -- no SQL ever reaches inside it.
    repeat jsonb,
    pushed_to_google boolean not null default false,
    -- The Google Calendar event id returned when this block was pushed --
    -- lets the timetable recognize its own pushed event in the synced-back
    -- Google Calendar feed and skip rendering it a second time.
    google_event_id text,
    created_at timestamptz not null default now()
);

alter table if exists planner_blocks add column if not exists google_event_id text;

create index if not exists planner_blocks_date_idx on planner_blocks (date);

create table if not exists planner_tasks (
    id uuid primary key default gen_random_uuid(),
    title text not null,
    notes text,
    due_date date,
    due_time text,
    tag_id uuid references planner_tags(id) on delete set null,
    -- Optional link to an existing event, for organizing a task alongside it
    -- -- tasks themselves are never scheduled as timetable blocks.
    event_id uuid references planner_blocks(id) on delete set null,
    completed_dates text[] not null default '{}',
    created_at timestamptz not null default now()
);

create index if not exists planner_tasks_tag_id_idx on planner_tasks (tag_id);
create index if not exists planner_tasks_event_id_idx on planner_tasks (event_id);

alter table planner_tags enable row level security;
alter table planner_tasks enable row level security;
alter table planner_blocks enable row level security;
