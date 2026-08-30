-- Escrow RPCs — port of src/lib/escrowLedger.mjs.

-- Internal only: shared refund logic, called by admin_refund_escrow here
-- and by buyer_cancel_order/farmer_reject_order/admin_cancel_order (added
-- in the order-lifecycle migration). Callers are responsible for their own
-- authorization and order-status checks before calling this.
create or replace function public.refund_escrow_for_order_internal(
  p_order_id uuid,
  p_reason text,
  p_actor_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order record;
  v_escrow record;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'Order not found' using errcode = 'P0002';
  end if;

  select * into v_escrow from public.escrows where order_id = p_order_id for update;

  if v_escrow is null or v_escrow.status = 'refunded' then
    if v_order.payment_status = 'paid' then
      update public.orders set payment_status = 'refunded', escrow_status = 'refunded' where id = p_order_id;
    end if;
    perform public.restore_stock_for_order(p_order_id);
    return;
  end if;

  if v_escrow.status = 'released' then
    raise exception 'Funds have already been released' using errcode = 'P0001';
  end if;

  update public.escrows
    set status = 'refunded', refunded_at = now(), refunded_by = p_actor_user_id,
        refund_reason = coalesce(p_reason, 'Order cancelled')
    where id = v_escrow.id;

  update public.orders set payment_status = 'refunded', escrow_status = 'refunded' where id = p_order_id;

  perform public.restore_stock_for_order(p_order_id);

  update public.profiles set account_balance = account_balance + v_escrow.amount where id = v_order.buyer_id;

  insert into public.refund_ledger (user_id, order_id, escrow_id, amount, reason, refunded_at)
  values (v_order.buyer_id, p_order_id, v_escrow.id, v_escrow.amount, coalesce(p_reason, 'Order cancelled'), now());
end;
$$;

revoke execute on function public.refund_escrow_for_order_internal(uuid, text, uuid) from public;

-- Public, admin-only: direct escrow release (matches POST /admin/escrow/:id/release).
create or replace function public.release_escrow_to_farmer(
  p_escrow_id uuid,
  p_release_notes text default null
)
returns public.escrows
language plpgsql
security definer
set search_path = public
as $$
declare
  v_escrow record;
  v_order record;
begin
  if not public.is_admin() then
    raise exception 'Admin required' using errcode = '42501';
  end if;

  select * into v_escrow from public.escrows where id = p_escrow_id for update;
  if not found then
    raise exception 'Escrow not found' using errcode = 'P0002';
  end if;

  select * into v_order from public.orders where id = v_escrow.order_id for update;
  if not found then
    raise exception 'Order not found' using errcode = 'P0002';
  end if;

  if v_order.status not in ('receipt_confirmed', 'completed') then
    raise exception 'Order must be receipt confirmed before escrow can be released' using errcode = 'P0001';
  end if;

  if v_escrow.status <> 'pending' then
    raise exception 'Cannot release escrow with status: %', v_escrow.status using errcode = 'P0001';
  end if;

  update public.escrows
    set status = 'released', released_at = now(), released_by = auth.uid(), release_notes = p_release_notes
    where id = p_escrow_id
    returning * into v_escrow;

  update public.orders
    set payment_status = 'paid', escrow_status = 'released', escrow_released_at = v_escrow.released_at
    where id = v_escrow.order_id;

  update public.farmers set account_balance = account_balance + v_escrow.amount where id = v_escrow.farmer_id;

  insert into public.released_funds_ledger (farmer_id, order_id, escrow_id, amount, released_at, released_by, notes)
  values (v_escrow.farmer_id, v_escrow.order_id, v_escrow.id, v_escrow.amount, v_escrow.released_at, auth.uid(), p_release_notes);

  return v_escrow;
end;
$$;

grant execute on function public.release_escrow_to_farmer(uuid, text) to authenticated;

-- Public, admin-only: direct escrow refund (matches POST /admin/escrow/:id/refund).
create or replace function public.admin_refund_escrow(
  p_escrow_id uuid,
  p_refund_reason text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_escrow record;
begin
  if not public.is_admin() then
    raise exception 'Admin required' using errcode = '42501';
  end if;

  select * into v_escrow from public.escrows where id = p_escrow_id;
  if not found then
    raise exception 'Escrow not found' using errcode = 'P0002';
  end if;
  if v_escrow.status = 'refunded' then
    raise exception 'Escrow already refunded' using errcode = 'P0001';
  end if;

  perform public.refund_escrow_for_order_internal(v_escrow.order_id, coalesce(p_refund_reason, 'Refunded by admin'), auth.uid());
end;
$$;

grant execute on function public.admin_refund_escrow(uuid, text) to authenticated;
