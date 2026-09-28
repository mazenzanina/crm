-- Fix for: "Signup protection is not configured. Run the supplied Supabase SQL."
-- Run in the SQL Editor of the SAME Supabase project used by the deployed CRM.
-- Safe to rerun: retains existing signup attempts and client records.
-- Do not put database passwords or service-role keys in this file.

create table if not exists public.signup_attempts (
  bucket text primary key,
  attempt_count integer not null default 0,
  updated_at timestamptz not null default now()
);

create index if not exists signup_attempts_updated_at_idx
  on public.signup_attempts (updated_at);

create or replace function public.claim_signup_attempt(
  p_bucket text,
  p_limit integer default 5
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare n integer;
begin
  -- Fingerprints are salted on the server; no raw IP addresses are stored here.
  delete from public.signup_attempts
  where updated_at < now() - interval '8 days';

  insert into public.signup_attempts (bucket, attempt_count)
  values (p_bucket, 1)
  on conflict (bucket) do update set
    attempt_count = signup_attempts.attempt_count + 1,
    updated_at = now()
  returning attempt_count into n;

  return n <= least(greatest(p_limit, 1), 20);
end;
$$;

alter table public.signup_attempts enable row level security;
revoke all on public.signup_attempts from anon, authenticated;
revoke execute on function public.claim_signup_attempt(text, integer)
  from public, anon, authenticated;
grant execute on function public.claim_signup_attempt(text, integer)
  to service_role;

-- Make PostgREST see newly created functions without waiting for its schema cache.
notify pgrst, 'reload schema';

-- Expected result: a table name, a function name, and TRUE.
select to_regclass('public.signup_attempts') as rate_limit_table,
       to_regprocedure('public.claim_signup_attempt(text,integer)') as rate_limit_function,
       has_function_privilege('service_role',
         'public.claim_signup_attempt(text,integer)',
         'EXECUTE') as service_role_can_call;
