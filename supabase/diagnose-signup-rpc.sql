-- Diagnostic for the CRM error "Signup protection is not configured".
-- Run in the Supabase SQL Editor for the EXACT project used by the CRM.
-- No client details or secrets are read. One non-personal test bucket is inserted;
-- it will be removed by the rate-limit function after eight days.
-- Expected: function exists, schema_usage = true, service_can_execute = true,
-- and function_body_works = true. If this SQL itself fails, copy only its error text.

select
  to_regprocedure('public.claim_signup_attempt(text,integer)')
    as rate_limit_function,
  has_schema_privilege('service_role', 'public', 'USAGE')
    as schema_usage,
  has_function_privilege('service_role',
    'public.claim_signup_attempt(text,integer)', 'EXECUTE')
    as service_can_execute,
  public.claim_signup_attempt(
    'sql_editor_test_' || md5(random()::text || clock_timestamp()::text), 5)
    as function_body_works;
