-- =========================================================================
-- Lower the buyer service charge from ₦1,200 to ₦200 per checkout.
-- Same create_split_orders as 0028; only v_service_fee changes. The fee is
-- still charged once per checkout and split across the farmers' sub-orders
-- (floor share each, remainder spread one naira at a time).
-- =========================================================================

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
  v_service_fee constant integer := 200;
  v_sub_order_count integer;
  v_base_share integer;
  v_remainder integer;
  v_service_share integer;
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

  v_base_share := v_service_fee / v_sub_order_count; -- integer division, floor
  v_remainder := v_service_fee - (v_base_share * v_sub_order_count);

  for v_group in select farmer_id, sum(price * quantity) as subtotal from _cart_lines group by farmer_id loop
    v_service_share := v_base_share + (case when v_sub_order_index <= v_remainder then 1 else 0 end);

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
