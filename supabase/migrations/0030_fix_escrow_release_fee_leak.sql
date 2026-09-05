-- release_escrow_to_farmer credited the farmer with the full escrow amount
-- (orders.total = subtotal + service_fee + delivery_fee), not just their
-- share of the sale. Since nothing anywhere else retains service_fee as
-- platform revenue or routes delivery_fee to whoever actually delivers
-- (drivers have no balance/earnings column -- see 0001), every release was
-- silently paying the buyer's ₦1200 platform fee and the transport fare
-- straight into the farmer's payable balance. escrows.amount itself is left
-- untouched, since admin_refund_escrow and the admin escrow dashboard both
-- correctly rely on it representing the full amount actually held.

create or replace function public.release_escrow_to_farmer(p_escrow_id uuid, p_release_notes text default null)
returns public.escrows
language plpgsql security definer set search_path = public as $$
declare v_escrow record; v_order record; v_farmer_share numeric;
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

  v_farmer_share := v_order.subtotal;

  update public.escrows
    set status = 'released', released_at = now(), released_by = auth.uid(), release_notes = p_release_notes
    where id = p_escrow_id returning * into v_escrow;

  update public.orders
    set payment_status = 'paid', escrow_status = 'released', escrow_released_at = v_escrow.released_at
    where id = v_escrow.order_id;

  update public.farmers set account_balance = account_balance + v_farmer_share where id = v_escrow.farmer_id;

  insert into public.released_funds_ledger (farmer_id, order_id, escrow_id, amount, released_at, released_by, notes)
  values (v_escrow.farmer_id, v_escrow.order_id, v_escrow.id, v_farmer_share, v_escrow.released_at, auth.uid(), p_release_notes);

  return v_escrow;
end; $$;
grant execute on function public.release_escrow_to_farmer(uuid, text) to authenticated;
