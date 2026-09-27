-- Run this once in the Supabase SQL editor. Single-admin CRM: no direct client access to tables.
-- ONLY server-side API routes use the service role key. Never expose it in browser code.

create extension if not exists pgcrypto;

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 80),
  phone text not null unique check (phone ~ '^\+[1-9][0-9]{7,14}$'),
  email text,
  location text,
  birth_date date,
  birth_time time,
  birth_place text,
  sun_sign text check (sun_sign in ('Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces')),
  preferred_language text not null default 'en' check (preferred_language in ('en','fr','tn')),
  status text not null default 'lead' check (status in ('lead','active','vip')),
  total_spent_tnd numeric(12,2) not null default 0 check (total_spent_tnd >= 0),
  notes text not null default '',
  daily_opt_in boolean not null default false,
  opted_in_at timestamptz,
  opted_out_at timestamptz,
  opt_in_source text,
  privacy_accepted_at timestamptz,
  adult_confirmed_at timestamptz,
  last_sent_on date,
  last_sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Also safe when rerunning against an earlier version of this schema.
alter table public.clients add column if not exists privacy_accepted_at timestamptz;
alter table public.clients add column if not exists adult_confirmed_at timestamptz;

create index if not exists clients_created_at_idx on public.clients (created_at desc);
create index if not exists clients_daily_queue_idx on public.clients (daily_opt_in, last_sent_on);

create table if not exists public.app_settings (
  id integer primary key default 1 check (id = 1),
  booking_url text not null default 'https://wa.me/21622481622',
  updated_at timestamptz not null default now()
);
insert into public.app_settings (id) values (1) on conflict (id) do nothing;

-- A hashed-IP daily counter for the public signup form. Raw IPs are never stored.
create table if not exists public.signup_attempts (
  bucket text primary key,
  attempt_count integer not null default 0,
  updated_at timestamptz not null default now()
);
create index if not exists signup_attempts_updated_at_idx on public.signup_attempts (updated_at);

create or replace function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists clients_touch_updated_at on public.clients;
create trigger clients_touch_updated_at before update on public.clients
for each row execute function public.touch_updated_at();

drop trigger if exists settings_touch_updated_at on public.app_settings;
create trigger settings_touch_updated_at before update on public.app_settings
for each row execute function public.touch_updated_at();

create or replace function public.claim_signup_attempt(p_bucket text, p_limit integer default 5)
returns boolean language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  -- Retain only recent salted fingerprints; no raw IPs are ever stored.
  delete from public.signup_attempts where updated_at < now() - interval '8 days';
  insert into public.signup_attempts (bucket, attempt_count)
  values (p_bucket, 1)
  on conflict (bucket) do update set
    attempt_count = signup_attempts.attempt_count + 1,
    updated_at = now()
  returning attempt_count into n;
  return n <= least(greatest(p_limit, 1), 20);
end;
$$;

alter table public.clients enable row level security;
alter table public.app_settings enable row level security;
alter table public.signup_attempts enable row level security;

-- No anon/authenticated RLS policies: even a logged-in user cannot bypass the checked admin API.
revoke all on public.clients from anon, authenticated;
revoke all on public.app_settings from anon, authenticated;
revoke all on public.signup_attempts from anon, authenticated;
revoke execute on function public.claim_signup_attempt(text, integer) from public, anon, authenticated;
grant execute on function public.claim_signup_attempt(text, integer) to service_role;
