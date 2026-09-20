-- admin_set_transport_fare updates delivery_fee/total/status/admin_notes but
-- never touched updated_at -- there's no generic updated_at trigger on
-- orders, each RPC has to set it itself. getBuyerRecentActivity()
-- (lib/kizfarm/supabase-data.ts) orders the buyer's in-app activity feed by
-- orders.updated_at, so without this an order silently never re-surfaced
-- there when the admin added its fare -- the buyer's in-app notification
-- for "your transport fare is ready" simply never appeared, even though
-- the status genuinely changed to awaiting_payment.

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
        status = 'awaiting_payment', admin_notes = v_note, updated_at = now()
    where id = p_order_id returning * into v_order;

  insert into public.order_status_notes (order_id, status, note) values (p_order_id, 'awaiting_payment', v_note);
  return v_order;
end; $$;
