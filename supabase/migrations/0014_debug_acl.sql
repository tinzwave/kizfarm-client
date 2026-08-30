create or replace function public.__debug_function_acl(p_function_name text)
returns table(function_signature text, acl text[])
language sql
security definer
set search_path = public
as $$
  select p.oid::regprocedure::text, p.proacl::text[]
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = p_function_name;
$$;
grant execute on function public.__debug_function_acl(text) to authenticated;
