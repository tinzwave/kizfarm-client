-- Fix: buyers got "new row violates row-level security policy for table
-- "chats"" when trying to message a farmer about a product that is out of
-- stock / deactivated (products.is_active = false, added in 0021).
--
-- Root cause: chats_insert (0028) added a check that product_id really
-- belongs to farmer_id --
--   exists (select 1 from public.products p where p.id = product_id and p.user_id = farmer_id)
-- -- to stop a client from spoofing an arbitrary farmer_id. But this is a
-- plain EXISTS against public.products from the inserting (buyer) role, so
-- it's itself subject to products_select RLS (0021):
--   is_active OR own product OR admin
-- A buyer is neither the owner nor an admin, so once a product is
-- deactivated, RLS filters the row out of that EXISTS entirely -- it
-- returns false even though product_id/farmer_id are completely correct --
-- and the chat insert is rejected with the generic RLS error. This wasn't
-- caught before because 0021 (product visibility) and 0028 (chat ownership
-- check) were independent fixes that happened to compose badly.
--
-- Fix: do the ownership check in a SECURITY DEFINER function (same pattern
-- as is_admin()/can_view_profile()) so it sees the real row regardless of
-- products_select RLS, while still only ever confirming a fact the buyer
-- is already allowed to know (whether this specific product_id/farmer_id
-- pairing is real) -- it does not expose the product row itself.

create or replace function public.product_belongs_to_farmer(p_product_id uuid, p_farmer_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.products
    where id = p_product_id and user_id = p_farmer_id
  );
$$;

drop policy chats_insert on public.chats;
create policy chats_insert on public.chats
  for insert with check (
    buyer_id = auth.uid()
    and (select status from public.profiles where id = auth.uid()) = 'active'
    and public.product_belongs_to_farmer(product_id, farmer_id)
  );
