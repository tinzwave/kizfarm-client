-- Fix: suspending/deactivating a buyer or farmer had zero real effect --
-- admin-guard/auth-guard/farmer-layout only ever checked session validity
-- and role, never profiles.status, and no RLS policy or RPC referenced it
-- either. A suspended account could keep ordering, posting products, and
-- chatting normally even though the admin UI's own confirm dialog claims
-- "This blocks them from logging in."
--
-- Scope, deliberately narrow: block a non-active profile from starting NEW
-- activity (placing an order, posting/editing a product, starting or
-- sending a chat message, a farmer accepting a new order). Do NOT block
-- managing already-in-flight work (buyer_cancel_order, buyer_confirm_receipt,
-- farmer_pack_order/farmer_reject_order, viewing existing products/orders/
-- chats) -- stranding an order mid-flight with no one able to act on it
-- would trade one bug for another. Admin is unaffected throughout.
--
-- This is the backend half of the fix; the frontend half (sign the user out
-- immediately on login/route-guard if their profile isn't active) is a
-- separate, non-SQL change.
--
-- Second, unrelated critical fix bundled in here because it touches the
-- same function: deactivating a product (is_active, added in 0021) was
-- only ever enforced by the products_select RLS policy -- create_split_orders
-- runs security definer and bypasses RLS entirely, so a buyer with a
-- deactivated product still in their cart (or a stale product-detail link)
-- could complete checkout and pay for it anyway. Now checked explicitly.

-- Farmer product writes: only the owning farmer, and only while active.
-- USING (governs select/delete/update-visibility) is untouched, so a
-- suspended farmer can still see their existing listings -- only inserting
-- a new product or editing an existing one is blocked.
drop policy products_farmer_write on public.products;
create policy products_farmer_write on public.products
  for all using (
    exists (select 1 from public.farmers f where f.id = farmer_id and f.user_id = auth.uid())
    or public.is_admin()
  )
  with check (
    (
      exists (select 1 from public.farmers f where f.id = farmer_id and f.user_id = auth.uid())
      and (select status from public.profiles where id = auth.uid()) = 'active'
    )
    or public.is_admin()
  );

-- Starting a new chat thread.
drop policy chats_insert on public.chats;
create policy chats_insert on public.chats
  for insert with check (
    buyer_id = auth.uid()
    and (select status from public.profiles where id = auth.uid()) = 'active'
  );

create or replace function public.send_chat_message(
  p_chat_id uuid,
  p_content text,
  p_message_type text default 'text',
  p_attachment_url text default null,
  p_attachment_type text default null
)
returns public.messages
language plpgsql
security definer
set search_path = public
as $$
declare
  v_chat public.chats%rowtype;
  v_receiver_id uuid;
  v_message public.messages%rowtype;
  v_last_message text;
begin
  if p_message_type not in ('text', 'image', 'file') then
    raise exception 'Invalid message type' using errcode = 'P0001';
  end if;
  if p_message_type = 'text' and coalesce(trim(p_content), '') = '' then
    raise exception 'Message content required' using errcode = 'P0001';
  end if;

  if (select status from public.profiles where id = auth.uid()) <> 'active' then
    raise exception 'Your account is not active. Please contact support.' using errcode = '42501';
  end if;

  select * into v_chat from public.chats where id = p_chat_id;
  if not found then
    raise exception 'Chat not found' using errcode = 'P0001';
  end if;
  if auth.uid() <> v_chat.buyer_id and auth.uid() <> v_chat.farmer_id then
    raise exception 'Unauthorized' using errcode = '42501';
  end if;

  v_receiver_id := case when auth.uid() = v_chat.buyer_id then v_chat.farmer_id else v_chat.buyer_id end;

  insert into public.messages (chat_id, sender_id, receiver_id, content, message_type, attachment_url, attachment_type, delivery_status)
  values (
    p_chat_id, auth.uid(), v_receiver_id,
    coalesce(nullif(trim(p_content), ''), case when p_message_type = 'image' then 'Sent an image' else 'Sent a file' end),
    p_message_type, p_attachment_url, p_attachment_type, 'sent'
  )
  returning * into v_message;

  v_last_message := case when p_message_type = 'image' then '📷 Image' when p_message_type = 'file' then '📎 File' else v_message.content end;

  update public.chats set
    last_message = v_last_message,
    last_message_time = v_message.created_at,
    last_message_sender_id = auth.uid(),
    updated_at = now()
  where id = p_chat_id;

  return v_message;
end;
$$;

-- Placing a new order.
create or replace function public.create_split_orders(
  p_items jsonb,
  p_address_id uuid default null,
  p_address jsonb default null,
  p_payment_method text default 'card'
)
returns setof public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_buyer_id uuid := auth.uid();
  v_delivery_label text;
  v_delivery_street text;
  v_delivery_city text;
  v_delivery_state text;
  v_delivery_phone text;
  v_master_order_id text;
  v_service_fee constant numeric := 1200;
  v_sub_order_count integer;
  v_service_share numeric;
  v_order_id uuid;
  v_order_row public.orders%rowtype;
  v_sub_order_index integer := 1;
  v_item jsonb;
  v_product record;
  v_requested integer;
  v_group record;
begin
  if v_buyer_id is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  if (select status from public.profiles where id = v_buyer_id) <> 'active' then
    raise exception 'Your account is not active. Please contact support.' using errcode = '42501';
  end if;

  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'No items provided' using errcode = 'P0001';
  end if;

  if p_address_id is not null then
    select label, street, city, state, phone
      into v_delivery_label, v_delivery_street, v_delivery_city, v_delivery_state, v_delivery_phone
      from public.addresses where id = p_address_id and user_id = v_buyer_id;
    if not found then
      raise exception 'Address not found' using errcode = 'P0002';
    end if;
  elsif p_address is not null then
    v_delivery_label := p_address->>'label';
    v_delivery_street := p_address->>'street';
    v_delivery_city := p_address->>'city';
    v_delivery_state := p_address->>'state';
    v_delivery_phone := p_address->>'phone';
  else
    raise exception 'Delivery address is required to place an order' using errcode = 'P0001';
  end if;

  create temp table _cart_lines (
    product_id uuid, farmer_id uuid, name text, price numeric,
    quantity integer, unit text, image text
  ) on commit drop;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_requested := greatest(1, coalesce((v_item->>'quantity')::integer, 1));

    select id, farmer_id, name, price, unit, quantity, is_active, images[1] as image
      into v_product
      from public.products where id = (v_item->>'productId')::uuid;

    if not found then
      continue;
    end if;

    if not v_product.is_active then
      raise exception '% is no longer available', v_product.name using errcode = 'P0001';
    end if;

    if v_product.quantity is not null and v_requested > v_product.quantity then
      raise exception '% only has % % in stock', v_product.name, v_product.quantity, coalesce(v_product.unit, 'units') using errcode = 'P0001';
    end if;

    insert into _cart_lines (product_id, farmer_id, name, price, quantity, unit, image)
    values (v_product.id, v_product.farmer_id, v_product.name, v_product.price, v_requested, v_product.unit, v_product.image);
  end loop;

  if not exists (select 1 from _cart_lines) then
    raise exception 'No valid products found' using errcode = 'P0002';
  end if;

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
    select v_order_id, product_id, name, price, quantity, unit, image
    from _cart_lines where farmer_id = v_group.farmer_id;

    v_sub_order_index := v_sub_order_index + 1;

    select * into v_order_row from public.orders where id = v_order_id;
    return next v_order_row;
  end loop;
end;
$$;

grant execute on function public.create_split_orders(jsonb, uuid, jsonb, text) to authenticated;

-- A farmer taking on a NEW pending order. Rejecting/packing an order
-- already assigned to them stays open (see note at top of file).
create or replace function public.farmer_accept_order(p_order_id uuid, p_notes text default null)
returns public.orders
language plpgsql security definer set search_path = public as $$
declare
  v_order public.orders%rowtype;
  v_farmer_id uuid;
begin
  if (select status from public.profiles where id = auth.uid()) <> 'active' then
    raise exception 'Your account is not active. Please contact support.' using errcode = '42501';
  end if;

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
