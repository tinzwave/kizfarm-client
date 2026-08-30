-- Order lifecycle RPCs — port of farmerOrders.mjs, buyer.mjs order actions,
-- and admin.mjs/orders.mjs order/driver management routes.
--
-- Note: email notifications for these transitions are intentionally NOT
-- wired up yet (deferred to a follow-up notification pass) -- these
-- functions handle the state transitions and authorization only, which is
-- the correctness-critical part. Flagged to the user.

-- ===================== FARMER =====================

create or replace function public.farmer_accept_order(p_order_id uuid, p_notes text default null)
returns public.orders
language plpgsql security definer set search_path = public as $$
declare
  v_order public.orders%rowtype;
  v_farmer_id uuid;
begin
  select id into v_farmer_id from public.farmers where user_id = auth.uid();
  if v_farmer_id is null then raise exception 'Farmer record not found' using errcode = 'P0002'; end if;

  select * into v_order from public.orders where id = p_order_id and farmer_id = v_farmer_id for update;
  if not found then raise exception 'Order not found' using errcode = 'P0002'; end if;
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
declare
  v_order public.orders%rowtype;
  v_farmer_id uuid;
  v_reason text;
begin
  select id into v_farmer_id from public.farmers where user_id = auth.uid();
  if v_farmer_id is null then raise exception 'Farmer record not found' using errcode = 'P0002'; end if;

  select * into v_order from public.orders where id = p_order_id and farmer_id = v_farmer_id for update;
  if not found then raise exception 'Order not found' using errcode = 'P0002'; end if;
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
declare
  v_order public.orders%rowtype;
  v_farmer_id uuid;
begin
  select id into v_farmer_id from public.farmers where user_id = auth.uid();
  if v_farmer_id is null then raise exception 'Farmer record not found' using errcode = 'P0002'; end if;

  select * into v_order from public.orders where id = p_order_id and farmer_id = v_farmer_id for update;
  if not found then raise exception 'Order not found' using errcode = 'P0002'; end if;
  if v_order.status <> 'confirmed' then
    raise exception 'Order must be confirmed by admin before packing. Current status: %', v_order.status using errcode = 'P0001';
  end if;

  update public.orders set status = 'packed', packed_at = now() where id = p_order_id returning * into v_order;
  return v_order;
end; $$;
grant execute on function public.farmer_pack_order(uuid) to authenticated;

-- ===================== BUYER =====================

create or replace function public.buyer_cancel_order(p_order_id uuid, p_reason text default null)
returns public.orders
language plpgsql security definer set search_path = public as $$
declare
  v_order public.orders%rowtype;
  v_reason text;
begin
  select * into v_order from public.orders where id = p_order_id and buyer_id = auth.uid() for update;
  if not found then raise exception 'Order not found' using errcode = 'P0002'; end if;
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
declare
  v_order public.orders%rowtype;
begin
  select * into v_order from public.orders where id = p_order_id and buyer_id = auth.uid() for update;
  if not found then raise exception 'Order not found' using errcode = 'P0002'; end if;
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
declare
  v_order public.orders%rowtype;
  v_driver public.drivers%rowtype;
begin
  if p_rating is null or p_rating < 1 or p_rating > 5 then
    raise exception 'rating must be between 1 and 5' using errcode = 'P0001';
  end if;

  select * into v_order from public.orders where id = p_order_id and buyer_id = auth.uid() for update;
  if not found then raise exception 'Order not found' using errcode = 'P0002'; end if;
  if v_order.driver_id is null then raise exception 'No driver assigned to this order' using errcode = 'P0001'; end if;
  if v_order.status not in ('receipt_confirmed', 'completed') then
    raise exception 'You can rate the driver after confirming receipt' using errcode = 'P0001';
  end if;
  if v_order.driver_rated_at is not null then raise exception 'Driver already rated for this order' using errcode = 'P0001'; end if;

  select * into v_driver from public.drivers where id = v_order.driver_id for update;
  if not found then raise exception 'Driver not found' using errcode = 'P0002'; end if;

  update public.drivers
    set rating_total = rating_total + p_rating,
        rating_count = rating_count + 1,
        average_rating = round((rating_total + p_rating)::numeric / (rating_count + 1), 1)
    where id = v_driver.id returning * into v_driver;

  update public.orders set driver_rating = p_rating, driver_rated_at = now() where id = p_order_id;
  return v_driver;
end; $$;
grant execute on function public.buyer_rate_driver(uuid, integer) to authenticated;

-- ===================== ADMIN =====================

create or replace function public.admin_set_transport_fare(p_order_id uuid, p_transport_fare numeric, p_notes text default null)
returns public.orders
language plpgsql security definer set search_path = public as $$
declare
  v_order public.orders%rowtype;
  v_note text;
begin
  if not public.is_admin() then raise exception 'Admin required' using errcode = '42501'; end if;
  if p_transport_fare is null or p_transport_fare < 0 then
    raise exception 'Transport fare must be a valid amount.' using errcode = 'P0001';
  end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if not found then raise exception 'Order not found' using errcode = 'P0002'; end if;
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
declare
  v_order public.orders%rowtype;
  v_driver public.drivers%rowtype;
begin
  if not public.is_admin() then raise exception 'Admin required' using errcode = '42501'; end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if not found then raise exception 'Order not found' using errcode = 'P0002'; end if;

  select * into v_driver from public.drivers where id = p_driver_id for update;
  if not found then raise exception 'Driver not found' using errcode = 'P0002'; end if;
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
  if not found then raise exception 'Order not found' using errcode = 'P0002'; end if;

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
declare
  v_order public.orders%rowtype;
  v_reason text;
begin
  if not public.is_admin() then raise exception 'Admin required' using errcode = '42501'; end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if not found then raise exception 'Order not found' using errcode = 'P0002'; end if;

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
