-- =========================================================================
-- CLOSE PAYMENT-REFERENCE REPLAY HOLE
-- =========================================================================
-- pay_order and activate_subscription both overwrote payment_reference with
-- whatever the caller passed, after only confirming that reference was A
-- real successful Paystack transaction of roughly the right amount -- not
-- that it was THE transaction for this specific order/course. A buyer could
-- pay once for order A, then replay that same reference against any other
-- order/course they own of a similar price and get it marked paid for free.
--
-- Fix: pay_order now requires the reference to equal the one already
-- stashed on the order by set_order_payment_reference before checkout
-- opened (exactly what the existing comments there already assumed was
-- happening). Unique constraints on both tables are added as a second,
-- database-level backstop so the same reference can never settle two
-- different orders or subscriptions even if a future caller forgets this
-- check.

create unique index orders_payment_reference_key
  on public.orders (payment_reference)
  where payment_reference is not null;

alter table public.subscriptions
  add constraint subscriptions_payment_reference_key unique (payment_reference);

create or replace function public.pay_order(p_order_id uuid, p_payment_reference text, p_payment_method text default null)
returns public.orders
language plpgsql security definer set search_path = public as $$
declare v_order public.orders%rowtype;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'Order not found' using errcode = 'P0001';
  end if;

  if v_order.payment_status = 'paid' then
    return v_order; -- already paid: idempotent no-op for double-fire (webhook + client both succeeding)
  end if;

  if v_order.payment_reference is distinct from p_payment_reference then
    raise exception 'Payment reference does not match this order' using errcode = 'P0001';
  end if;

  update public.orders
    set payment_status = 'paid', paid_at = now(), status = 'pending',
        payment_method = coalesce(p_payment_method, payment_method),
        admin_notes = 'Payment completed. Order is now awaiting farmer confirmation.'
    where id = p_order_id
    returning * into v_order;

  insert into public.order_status_notes (order_id, status, note)
  values (p_order_id, 'pending', 'Payment completed via webhook/verification.');

  perform public.decrement_stock_for_order(p_order_id);

  insert into public.escrows (order_id, master_order_id, buyer_id, farmer_id, amount, status)
  select v_order.id, v_order.master_order_id, v_order.buyer_id, v_order.farmer_id, v_order.total, 'pending'
  where not exists (select 1 from public.escrows where order_id = v_order.id);

  return v_order;
end; $$;

revoke execute on function public.pay_order(uuid, text, text) from anon, authenticated;
