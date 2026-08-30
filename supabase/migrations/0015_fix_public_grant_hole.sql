-- Vanilla Postgres grants EXECUTE to PUBLIC on every new function by
-- default, and PUBLIC is implicitly inherited by every role (including
-- anon/authenticated) -- a separate mechanism from Supabase's per-role
-- default grants that migration 0007 addressed. activate_subscription
-- was created fresh in 0012 without an explicit "revoke ... from public",
-- so it kept the default PUBLIC grant despite being intended internal-only.

revoke execute on function public.activate_subscription(uuid, uuid, text) from public;

-- Close this for every future function too, not just anon/authenticated.
alter default privileges in schema public revoke execute on functions from public;

drop function public.__debug_function_acl(text);
