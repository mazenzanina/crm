-- Run in Supabase SQL Editor for feedback / share / voice features
create table if not exists telegram_feedback (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id) on delete cascade,
  chat_id text not null,
  date_key date not null,
  feedback text not null check (feedback in ('up','down')),
  created_at timestamptz default now()
);
create table if not exists telegram_refs (
  id uuid primary key default gen_random_uuid(),
  chat_id text not null,
  ref text not null,
  created_at timestamptz default now()
);
-- optional: index for admin stats
create index if not exists idx_telegram_feedback_date on telegram_feedback(date_key);
create index if not exists idx_telegram_feedback_client on telegram_feedback(client_id);
