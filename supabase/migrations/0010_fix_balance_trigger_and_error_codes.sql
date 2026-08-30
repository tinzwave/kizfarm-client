-- Fix 1 (critical): protect_profile_privileged_columns silently discarded
-- legitimate account_balance credits made by trusted RPCs when the real
-- caller wasn't admin/service_role (e.g. a farmer rejecting an order, or a
-- buyer cancelling their own order -- both credit the BUYER's balance, but
-- neither caller is "admin"). auth.role()/is_admin() always reflect the
-- original caller even inside SECURITY DEFINER functions, so they can't
-- distinguish "trusted internal write" from "direct client write". Fix:
-- a transaction-local GUC flag that only trusted internal functions set,
-- right before touching the guarded columns.

create or replace function public.protect_profile_privileged_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(current_setting('app.bypass_profile_guard', true), '') <> 'on'
     and auth.role() <> 'service_role'
     and not public.is_admin()
  then
    new.role := old.role;
    new.status := old.status;
    new.suspension_reason := old.suspension_reason;
    new.suspended_at := old.suspended_at;
    new.account_balance := old.account_balance;
  end if;
  return new;
end;
$$;

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
    raise exception 'Order not found' using errcode = 'P0001';
  end if;

  select * into v_escrow from public.escrows where order_id = p_order_id for update;

  perform set_config('app.bypass_profile_guard', 'on', true);

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

revoke execute on function public.refund_escrow_for_order_internal(uuid, text, uuid) from anon, authenticated;

-- Fix 2: P0002 ("no_data_found") maps to HTTP 500 through PostgREST;
-- P0001 ("raise_exception") maps to 400. Every "not found" business-logic
-- error across the migration so far used P0002 -- normalize to P0001 for
-- consistent, frontend-usable error responses. Logic is unchanged from
-- what's already tested; only the errcode differs.

create or replace function public.decrement_stock_for_order(p_order_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_order record; v_item record; v_quantity integer;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then raise exception 'Order not found' using errcode = 'P0001'; end if;
  if v_order.stock_adjusted then return; end if;

  for v_item in select * from public.order_items where order_id = p_order_id loop
    if v_item.product_id is null then continue; end if;
    select quantity into v_quantity from public.products where id = v_item.product_id for update;
    if not found then raise exception '% no longer exists.', v_item.name using errcode = 'P0001'; end if;
    if v_quantity is null then continue; end if;
    if v_quantity < v_item.quantity then
      raise exception '% only has % % in stock.', v_item.name, v_quantity, coalesce(v_item.unit, 'units') using errcode = 'P0001';
    end if;
    update public.products set quantity = quantity - v_item.quantity where id = v_item.product_id;
  end loop;

  update public.orders set stock_adjusted = true, stock_adjusted_at = now() where id = p_order_id;
end; $$;
revoke execute on function public.decrement_stock_for_order(uuid) from anon, authenticated;

create or replace function public.restore_stock_for_order(p_order_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare v_order record; v_item record;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then raise exception 'Order not found' using errcode = 'P0001'; end if;
  if not v_order.stock_adjusted then return; end if;

  for v_item in select * from public.order_items where order_id = p_order_id loop
    if v_item.product_id is null then continue; end if;
    update public.products set quantity = quantity + v_item.quantity where id = v_item.product_id and quantity is not null;
  end loop;

  update public.orders set stock_adjusted = false, stock_adjusted_at = null where id = p_order_id;
end; $$;
revoke execute on function public.restore_stock_for_order(uuid) from anon, authenticated;

create or replace function public.pay_order(p_order_id uuid, p_payment_reference text, p_payment_method text default null)
returns public.orders
language plpgsql security definer set search_path = public as $$
declare v_order public.orders%rowtype;
begin
  update public.orders
    set payment_status = 'paid', paid_at = now(), status = 'pending',
        payment_reference = p_payment_reference, payment_method = coalesce(p_payment_method, payment_method),
        admin_notes = 'Payment completed. Order is now awaiting farmer confirmation.'
    where id = p_order_id and payment_status <> 'paid'
    returning * into v_order;

  if not found then
    select * into v_order from public.orders where id = p_order_id;
    if not found then raise exception 'Order not found' using errcode = 'P0001'; end if;
    return v_order;
  end if;

  insert into public.order_status_notes (order_id, status, note)
  values (p_order_id, 'pending', 'Payment completed via webhook/verification.');

  perform public.decrement_stock_for_order(p_order_id);

  insert into public.escrows (order_id, master_order_id, buyer_id, farmer_id, amount, status)
  select v_order.id, v_order.master_order_id, v_order.buyer_id, v_order.farmer_id, v_order.total, 'pending'
  where not exists (select 1 from public.escrows where order_id = v_order.id);

  select * into v_order from public.orders where id = p_order_id;
  return v_order;
end; $$;
revoke execute on function public.pay_order(uuid, text, text) from anon, authenticated;

create or replace function public.release_escrow_to_farmer(p_escrow_id uuid, p_release_notes text default null)
returns public.escrows
language plpgsql security definer set search_path = public as $$
declare v_escrow record; v_order record;
begin
  if not public.is_admin() then raise exception 'Admin required' using errcode = '42501'; end if;

  select * into v_escrow from public.escrows where id = p_escrow_id for update;
  if not found then raise exception 'Escrow not found' using errcode = 'P0001'; end if;

  select * into v_order from public.orders where id = v_escrow.order_id for update;
  if not found then raise exception 'Order not found' using errcode = 'P0001'; end if;

  if v_order.status not in ('receipt_confirmed', 'completed') then
    raise exception 'Order must be receipt confirmed before escrow can be released' using errcode = 'P0001';
  end if;
  if v_escrow.status <> 'pending' then
    raise exception 'Cannot release escrow with status: %', v_escrow.status using errcode = 'P0001';
  end if;

  update public.escrows
    set status = 'released', released_at = now(), released_by = auth.uid(), release_notes = p_release_notes
    where id = p_escrow_id returning * into v_escrow;

  update public.orders
    set payment_status = 'paid', escrow_status = 'released', escrow_released_at = v_escrow.released_at
    where id = v_escrow.order_id;

  update public.farmers set account_balance = account_balance + v_escrow.amount where id = v_escrow.farmer_id;

  insert into public.released_funds_ledger (farmer_id, order_id, escrow_id, amount, released_at, released_by, notes)
  values (v_escrow.farmer_id, v_escrow.order_id, v_escrow.id, v_escrow.amount, v_escrow.released_at, auth.uid(), p_release_notes);

  return v_escrow;
end; $$;
grant execute on function public.release_escrow_to_farmer(uuid, text) to authenticated;

create or replace function public.admin_refund_escrow(p_escrow_id uuid, p_refund_reason text default null)
returns void
language plpgsql security definer set search_path = public as $$
declare v_escrow record;
begin
  if not public.is_admin() then raise exception 'Admin required' using errcode = '42501'; end if;

  select * into v_escrow from public.escrows where id = p_escrow_id;
  if not found then raise exception 'Escrow not found' using errcode = 'P0001'; end if;
  if v_escrow.status = 'refunded' then raise exception 'Escrow already refunded' using errcode = 'P0001'; end if;

  perform public.refund_escrow_for_order_internal(v_escrow.order_id, coalesce(p_refund_reason, 'Refunded by admin'), auth.uid());
end; $$;
grant execute on function public.admin_refund_escrow(uuid, text) to authenticated;

create or replace function public.set_order_payment_reference(p_order_id uuid, p_reference text)
returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.orders set payment_reference = p_reference
    where id = p_order_id and buyer_id = auth.uid() and payment_status <> 'paid';
  if not found then raise exception 'Order not found or already paid' using errcode = 'P0001'; end if;
end; $$;
grant execute on function public.set_order_payment_reference(uuid, text) to authenticated;

create or replace function public.farmer_accept_order(p_order_id uuid, p_notes text default null)
returns public.orders
language plpgsql security definer set search_path = public as $$
declare v_order public.orders%rowtype; v_farmer_id uuid;
begin
  select id into v_farmer_id from public.farmers where user_id = auth.uid();
  if v_farmer_id is null then raise exception 'Farmer record not found' using errcode = 'P0001'; end if;

  select * into v_order from public.orders where id = p_order_id and farmer_id = v_farmer_id for update;
  if not found then raise exception 'Order not found' using errcode = 'P0001'; end if;
  if v_order.status <> 'pending' then raise exception 'Only pending orders can be accepted' using errcode = 'P0001'; end if;

  update public.orders
    set status = 'accepted_by_farmer', accepted_at = now(), farmer_notes = coalesce(p_notes, farmer_notes)
    where id = p_order_id returning * into v_order;
  return v_order;
end; $$;
grant execute on function public.farmer_accept_order(uuid, text) to authenticated;

create or replace function public.farmer_reject_order(p_order_id uuid, p_reason text default null)
returns public.orders
language plpgsql security definer set search_path = public as $$
declare v_order public.orders%rowtype; v_farmer_id uuid; v_reason text;
begin
  select id into v_farmer_id from public.farmers where user_id = auth.uid();
  if v_farmer_id is null then raise exception 'Farmer record not found' using errcode = 'P0001'; end if;

  select * into v_order from public.orders where id = p_order_id and farmer_id = v_farmer_id for update;
  if not found then raise exception 'Order not found' using errcode = 'P0001'; end if;
  if v_order.status <> 'pending' then raise exception 'Only pending orders can be rejected' using errcode = 'P0001'; end if;

  v_reason := coalesce(p_reason, 'Rejected by farmer');
  update public.orders set status = 'rejected', cancelled_at = now(), cancellation_reason = v_reason where id = p_order_id;
  perform public.refund_escrow_for_order_internal(p_order_id, v_reason, auth.uid());

  select * into v_order from public.orders where id = p_order_id;
  return v_order;
end; $$;
grant execute on function public.farmer_reject_order(uuid, text) to authenticated;

create or replace function public.farmer_pack_order(p_order_id uuid)
returns public.orders
language plpgsql security definer set search_path = public as $$
declare v_order public.orders%rowtype; v_farmer_id uuid;
begin
  select id into v_farmer_id from public.farmers where user_id = auth.uid();
  if v_farmer_id is null then raise exception 'Farmer record not found' using errcode = 'P0001'; end if;

  select * into v_order from public.orders where id = p_order_id and farmer_id = v_farmer_id for update;
  if not found then raise exception 'Order not found' using errcode = 'P0001'; end if;
  if v_order.status <> 'confirmed' then
    raise exception 'Order must be confirmed by admin before packing. Current status: %', v_order.status using errcode = 'P0001';
  end if;

  update public.orders set status = 'packed', packed_at = now() where id = p_order_id returning * into v_order;
  return v_order;
end; $$;
grant execute on function public.farmer_pack_order(uuid) to authenticated;

create or replace function public.buyer_cancel_order(p_order_id uuid, p_reason text default null)
returns public.orders
language plpgsql security definer set search_path = public as $$
declare v_order public.orders%rowtype; v_reason text;
begin
  select * into v_order from public.orders where id = p_order_id and buyer_id = auth.uid() for update;
  if not found then raise exception 'Order not found' using errcode = 'P0001'; end if;
  if v_order.status not in ('awaiting_transport_quote', 'awaiting_payment', 'pending', 'confirmed') then
    raise exception 'Order cannot be cancelled at this stage' using errcode = 'P0001';
  end if;

  v_reason := coalesce(p_reason, 'Cancelled by buyer');
  update public.orders set status = 'cancelled', cancellation_reason = v_reason, cancelled_at = now() where id = p_order_id;
  perform public.refund_escrow_for_order_internal(p_order_id, v_reason, auth.uid());

  if v_order.driver_id is not null then
    update public.drivers set status = 'active', current_order_id = null where id = v_order.driver_id and current_order_id = p_order_id;
  end if;

  select * into v_order from public.orders where id = p_order_id;
  return v_order;
end; $$;
grant execute on function public.buyer_cancel_order(uuid, text) to authenticated;

create or replace function public.buyer_confirm_receipt(p_order_id uuid)
returns public.orders
language plpgsql security definer set search_path = public as $$
declare v_order public.orders%rowtype;
begin
  select * into v_order from public.orders where id = p_order_id and buyer_id = auth.uid() for update;
  if not found then raise exception 'Order not found' using errcode = 'P0001'; end if;
  if v_order.status <> 'delivered' then raise exception 'Order has not been marked as delivered yet' using errcode = 'P0001'; end if;

  update public.orders set status = 'completed', receipt_confirmed_at = now() where id = p_order_id;

  if v_order.driver_id is not null then
    update public.drivers set status = 'active', current_order_id = null, total_deliveries = total_deliveries + 1
      where id = v_order.driver_id and current_order_id = p_order_id;
  end if;

  select * into v_order from public.orders where id = p_order_id;
  return v_order;
end; $$;
grant execute on function public.buyer_confirm_receipt(uuid) to authenticated;

create or replace function public.buyer_rate_driver(p_order_id uuid, p_rating integer)
returns public.drivers
language plpgsql security definer set search_path = public as $$
declare v_order public.orders%rowtype; v_driver public.drivers%rowtype;
begin
  if p_rating is null or p_rating < 1 or p_rating > 5 then
    raise exception 'rating must be between 1 and 5' using errcode = 'P0001';
  end if;

  select * into v_order from public.orders where id = p_order_id and buyer_id = auth.uid() for update;
  if not found then raise exception 'Order not found' using errcode = 'P0001'; end if;
  if v_order.driver_id is null then raise exception 'No driver assigned to this order' using errcode = 'P0001'; end if;
  if v_order.status not in ('receipt_confirmed', 'completed') then
    raise exception 'You can rate the driver after confirming receipt' using errcode = 'P0001';
  end if;
  if v_order.driver_rated_at is not null then raise exception 'Driver already rated for this order' using errcode = 'P0001'; end if;

  select * into v_driver from public.drivers where id = v_order.driver_id for update;
  if not found then raise exception 'Driver not found' using errcode = 'P0001'; end if;

  update public.drivers
    set rating_total = rating_total + p_rating, rating_count = rating_count + 1,
        average_rating = round((rating_total + p_rating)::numeric / (rating_count + 1), 1)
    where id = v_driver.id returning * into v_driver;

  update public.orders set driver_rating = p_rating, driver_rated_at = now() where id = p_order_id;
  return v_driver;
end; $$;
grant execute on function public.buyer_rate_driver(uuid, integer) to authenticated;

create or replace function public.admin_set_transport_fare(p_order_id uuid, p_transport_fare numeric, p_notes text default null)
returns public.orders
language plpgsql security definer set search_path = public as $$
declare v_order public.orders%rowtype; v_note text;
begin
  if not public.is_admin() then raise exception 'Admin required' using errcode = '42501'; end if;
  if p_transport_fare is null or p_transport_fare < 0 then
    raise exception 'Transport fare must be a valid amount.' using errcode = 'P0001';
  end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if not found then raise exception 'Order not found' using errcode = 'P0001'; end if;
  if v_order.status not in ('awaiting_transport_quote', 'awaiting_payment') then
    raise exception 'Transport fare can only be added before payment. Current status: %', v_order.status using errcode = 'P0001';
  end if;

  v_note := coalesce(p_notes, 'Transport fare added: NGN' || to_char(p_transport_fare, 'FM999,999,999'));

  update public.orders
    set delivery_fee = p_transport_fare, total = subtotal + coalesce(service_fee, 0) + p_transport_fare,
        status = 'awaiting_payment', admin_notes = v_note
    where id = p_order_id returning * into v_order;

  insert into public.order_status_notes (order_id, status, note) values (p_order_id, 'awaiting_payment', v_note);
  return v_order;
end; $$;
grant execute on function public.admin_set_transport_fare(uuid, numeric, text) to authenticated;

create or replace function public.admin_assign_driver(p_order_id uuid, p_driver_id uuid)
returns public.orders
language plpgsql security definer set search_path = public as $$
declare v_order public.orders%rowtype; v_driver public.drivers%rowtype;
begin
  if not public.is_admin() then raise exception 'Admin required' using errcode = '42501'; end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if not found then raise exception 'Order not found' using errcode = 'P0001'; end if;

  select * into v_driver from public.drivers where id = p_driver_id for update;
  if not found then raise exception 'Driver not found' using errcode = 'P0001'; end if;
  if v_driver.status <> 'active' then raise exception 'Driver is not available (active)' using errcode = 'P0001'; end if;

  if v_order.driver_id is not null then
    update public.drivers set status = 'active', current_order_id = null where id = v_order.driver_id;
  end if;

  update public.orders set driver_id = p_driver_id, status = 'assigned', assigned_at = now() where id = p_order_id returning * into v_order;
  update public.drivers set status = 'busy', current_order_id = p_order_id where id = p_driver_id;
  return v_order;
end; $$;
grant execute on function public.admin_assign_driver(uuid, uuid) to authenticated;

create or replace function public.admin_set_order_status(p_order_id uuid, p_status text, p_notes text default null)
returns public.orders
language plpgsql security definer set search_path = public as $$
declare
  v_order public.orders%rowtype;
  v_valid_statuses text[] := array['awaiting_transport_quote','awaiting_payment','pending','accepted_by_farmer','confirmed','packed','assigned','in_transit','delivered','receipt_confirmed','completed','cancelled'];
begin
  if not public.is_admin() then raise exception 'Admin required' using errcode = '42501'; end if;
  if not (p_status = any(v_valid_statuses)) then raise exception 'Invalid status' using errcode = 'P0001'; end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if not found then raise exception 'Order not found' using errcode = 'P0001'; end if;

  update public.orders set status = p_status where id = p_order_id;

  if p_notes is not null then
    insert into public.order_status_notes (order_id, status, note) values (p_order_id, p_status, p_notes);
    update public.orders set admin_notes = p_notes where id = p_order_id;
  end if;

  update public.orders set
    accepted_at = case when p_status = 'accepted_by_farmer' then now() else accepted_at end,
    confirmed_at = case when p_status = 'confirmed' then now() else confirmed_at end,
    packed_at = case when p_status = 'packed' then now() else packed_at end,
    assigned_at = case when p_status = 'assigned' then now() else assigned_at end,
    picked_up_at = case when p_status = 'in_transit' then now() else picked_up_at end,
    delivered_at = case when p_status = 'delivered' then now() else delivered_at end,
    receipt_confirmed_at = case when p_status = 'receipt_confirmed' then now() else receipt_confirmed_at end,
    cancelled_at = case when p_status = 'cancelled' then now() else cancelled_at end,
    cancellation_reason = case when p_status = 'cancelled' then coalesce(p_notes, 'Order cancelled') else cancellation_reason end
  where id = p_order_id;

  if p_status = 'cancelled' and v_order.driver_id is not null then
    update public.drivers set status = 'active', current_order_id = null where id = v_order.driver_id and current_order_id = p_order_id;
    update public.orders set driver_id = null where id = p_order_id;
  end if;

  if p_status in ('delivered', 'receipt_confirmed', 'completed') and v_order.driver_id is not null then
    update public.drivers set status = 'active', current_order_id = null, total_deliveries = total_deliveries + 1
      where id = v_order.driver_id and current_order_id = p_order_id;
  end if;

  if p_status = 'cancelled' then
    perform public.refund_escrow_for_order_internal(p_order_id, coalesce(p_notes, 'Order cancelled by admin'), auth.uid());
  end if;

  select * into v_order from public.orders where id = p_order_id;
  return v_order;
end; $$;
grant execute on function public.admin_set_order_status(uuid, text, text) to authenticated;

create or replace function public.admin_cancel_order(p_order_id uuid, p_reason text default null)
returns public.orders
language plpgsql security definer set search_path = public as $$
declare v_order public.orders%rowtype; v_reason text;
begin
  if not public.is_admin() then raise exception 'Admin required' using errcode = '42501'; end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if not found then raise exception 'Order not found' using errcode = 'P0001'; end if;

  if v_order.driver_id is not null then
    raise exception 'Cannot cancel order - driver has already been assigned' using errcode = 'P0001';
  end if;
  if v_order.status in ('in_transit', 'delivered', 'receipt_confirmed', 'completed') then
    raise exception 'Cannot cancel order with status: %', v_order.status using errcode = 'P0001';
  end if;

  v_reason := coalesce(p_reason, 'Cancelled by admin');
  update public.orders set status = 'cancelled', cancelled_at = now(), cancellation_reason = v_reason where id = p_order_id;
  perform public.refund_escrow_for_order_internal(p_order_id, v_reason, auth.uid());

  select * into v_order from public.orders where id = p_order_id;
  return v_order;
end; $$;
grant execute on function public.admin_cancel_order(uuid, text) to authenticated;

create or replace function public.create_split_orders(
  p_items jsonb, p_address_id uuid default null, p_address jsonb default null, p_payment_method text default 'card'
)
returns setof public.orders
language plpgsql security definer set search_path = public as $$
declare
  v_buyer_id uuid := auth.uid();
  v_delivery_label text; v_delivery_street text; v_delivery_city text; v_delivery_state text; v_delivery_phone text;
  v_master_order_id text;
  v_service_fee constant numeric := 1200;
  v_sub_order_count integer; v_service_share numeric;
  v_order_id uuid; v_order_row public.orders%rowtype;
  v_sub_order_index integer := 1;
  v_item jsonb; v_product record; v_requested integer; v_group record;
begin
  if v_buyer_id is null then raise exception 'Not authenticated' using errcode = '42501'; end if;
  if p_items is null or jsonb_array_length(p_items) = 0 then raise exception 'No items provided' using errcode = 'P0001'; end if;

  if p_address_id is not null then
    select label, street, city, state, phone
      into v_delivery_label, v_delivery_street, v_delivery_city, v_delivery_state, v_delivery_phone
      from public.addresses where id = p_address_id and user_id = v_buyer_id;
    if not found then raise exception 'Address not found' using errcode = 'P0001'; end if;
  elsif p_address is not null then
    v_delivery_label := p_address->>'label'; v_delivery_street := p_address->>'street';
    v_delivery_city := p_address->>'city'; v_delivery_state := p_address->>'state'; v_delivery_phone := p_address->>'phone';
  else
    raise exception 'Delivery address is required to place an order' using errcode = 'P0001';
  end if;

  create temp table _cart_lines (
    product_id uuid, farmer_id uuid, name text, price numeric, quantity integer, unit text, image text
  ) on commit drop;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_requested := greatest(1, coalesce((v_item->>'quantity')::integer, 1));
    select id, farmer_id, name, price, unit, quantity, images[1] as image
      into v_product from public.products where id = (v_item->>'productId')::uuid;
    if not found then continue; end if;
    if v_product.quantity is not null and v_requested > v_product.quantity then
      raise exception '% only has % % in stock', v_product.name, v_product.quantity, coalesce(v_product.unit, 'units') using errcode = 'P0001';
    end if;
    insert into _cart_lines (product_id, farmer_id, name, price, quantity, unit, image)
    values (v_product.id, v_product.farmer_id, v_product.name, v_product.price, v_requested, v_product.unit, v_product.image);
  end loop;

  if not exists (select 1 from _cart_lines) then raise exception 'No valid products found' using errcode = 'P0001'; end if;

  select count(distinct farmer_id) into v_sub_order_count from _cart_lines;
  v_master_order_id := 'KFM-' || upper(to_hex((extract(epoch from clock_timestamp()) * 1000)::bigint)) || '-' || upper(substr(md5(random()::text), 1, 4));

  for v_group in select farmer_id, sum(price * quantity) as subtotal from _cart_lines group by farmer_id loop
    v_service_share := ceil(v_service_fee / v_sub_order_count);

    insert into public.orders (
      master_order_id, sub_order_index, sub_order_count, buyer_id, farmer_id,
      subtotal, delivery_fee, service_fee, total, payment_method, payment_status,
      delivery_label, delivery_street, delivery_city, delivery_state, delivery_phone,
      status, admin_notes
    ) values (
      v_master_order_id, v_sub_order_index, v_sub_order_count, v_buyer_id, v_group.farmer_id,
      v_group.subtotal, 0, v_service_share, v_group.subtotal + v_service_share, coalesce(p_payment_method, 'card'), 'pending',
      v_delivery_label, v_delivery_street, v_delivery_city, v_delivery_state, v_delivery_phone,
      'awaiting_transport_quote', 'Transport fare request submitted. Admin should add the transport fare before payment.'
    ) returning id into v_order_id;

    insert into public.order_status_notes (order_id, status, note)
    values (v_order_id, 'awaiting_transport_quote', 'Buyer requested transport fare review.');

    insert into public.order_items (order_id, product_id, name, price, quantity, unit, image)
    select v_order_id, product_id, name, price, quantity, unit, image from _cart_lines where farmer_id = v_group.farmer_id;

    v_sub_order_index := v_sub_order_index + 1;
    select * into v_order_row from public.orders where id = v_order_id;
    return next v_order_row;
  end loop;
end; $$;
grant execute on function public.create_split_orders(jsonb, uuid, jsonb, text) to authenticated;
