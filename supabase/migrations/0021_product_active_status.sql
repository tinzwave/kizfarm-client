-- =========================================================================
-- PRODUCT ACTIVE/DELIST STATUS
-- =========================================================================
-- Farmers had no way to remove a listing -- farmer-products-page.tsx
-- referenced a p.status field that toFarmerProduct never actually set, so
-- it silently never rendered. Setting quantity to 0 only marks a product
-- "out of stock", it doesn't hide it.
-- A real hard DELETE isn't safe here: order_items.product_id references
-- products with no ON DELETE clause, so deleting a product that's ever
-- been ordered would fail with a raw foreign-key-violation. Soft-delete
-- via is_active instead.

alter table public.products add column is_active boolean not null default true;

-- Public/buyer visibility now requires is_active; farmer (own products)
-- and admin still see everything, active or not, so they can re-list.
drop policy products_select on public.products;
create policy products_select on public.products
  for select using (
    is_active
    or exists (select 1 from public.farmers f where f.id = farmer_id and f.user_id = auth.uid())
    or public.is_admin()
  );
