-- Supabase grants EXECUTE to anon/authenticated by default on every new
-- function (ALTER DEFAULT PRIVILEGES), which a bare "REVOKE ... FROM PUBLIC"
-- does not undo. Explicitly revoke from anon/authenticated on every
-- internal-only function so they're only reachable via service_role
-- (Edge Functions) or from inside other SECURITY DEFINER functions.

revoke execute on function public.decrement_stock_for_order(uuid) from anon, authenticated;
revoke execute on function public.restore_stock_for_order(uuid) from anon, authenticated;
revoke execute on function public.refund_escrow_for_order_internal(uuid, text, uuid) from anon, authenticated;
revoke execute on function public.pay_order(uuid, text, text) from anon, authenticated;

-- Also close the default hole going forward for any function created
-- later in the public schema, so this doesn't silently recur.
alter default privileges in schema public revoke execute on functions from anon, authenticated;
