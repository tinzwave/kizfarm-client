-- Inventory RPCs — port of src/lib/inventory.mjs, now real transactions
-- instead of manual compensating rollback: any exception raised mid-loop
-- rolls back every change made earlier in the same call automatically.
-- Internal-only: called by pay_order / refund RPCs, not directly by clients.

create or replace function public.decrement_stock_for_order(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order record;
  v_item record;
  v_updated integer;
  v_quantity integer;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'Order not found' using errcode = 'P0002';
  end if;
  if v_order.stock_adjusted then
    return;
  end if;

  for v_item in select * from public.order_items where order_id = p_order_id loop
    if v_item.product_id is null then
      continue;
    end if;

    select quantity into v_quantity from public.products where id = v_item.product_id for update;

    if not found then
      raise exception '% no longer exists.', v_item.name using errcode = 'P0001';
    end if;

    if v_quantity is null then
      continue; -- unlimited stock, nothing to decrement
    end if;

    if v_quantity < v_item.quantity then
      raise exception '% only has % % in stock.', v_item.name, v_quantity, coalesce(v_item.unit, 'units') using errcode = 'P0001';
    end if;

    update public.products set quantity = quantity - v_item.quantity where id = v_item.product_id;
  end loop;

  update public.orders set stock_adjusted = true, stock_adjusted_at = now() where id = p_order_id;
end;
$$;

create or replace function public.restore_stock_for_order(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order record;
  v_item record;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'Order not found' using errcode = 'P0002';
  end if;
  if not v_order.stock_adjusted then
    return;
  end if;

  for v_item in select * from public.order_items where order_id = p_order_id loop
    if v_item.product_id is null then
      continue;
    end if;
    update public.products
      set quantity = quantity + v_item.quantity
      where id = v_item.product_id and quantity is not null;
  end loop;

  update public.orders set stock_adjusted = false, stock_adjusted_at = null where id = p_order_id;
end;
$$;

revoke execute on function public.decrement_stock_for_order(uuid) from public;
revoke execute on function public.restore_stock_for_order(uuid) from public;
