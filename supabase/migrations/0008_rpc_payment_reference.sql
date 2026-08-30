-- Buyer sets the expected Paystack reference on their order right before
-- opening the Paystack checkout UI, so the webhook (which can arrive
-- before, instead of, or racing the client's own callback) has something
-- reliable to match the incoming charge.success event against.
create or replace function public.set_order_payment_reference(p_order_id uuid, p_reference text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.orders
    set payment_reference = p_reference
    where id = p_order_id and buyer_id = auth.uid() and payment_status <> 'paid';

  if not found then
    raise exception 'Order not found or already paid' using errcode = 'P0002';
  end if;
end;
$$;

grant execute on function public.set_order_payment_reference(uuid, text) to authenticated;
