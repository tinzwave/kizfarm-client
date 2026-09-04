-- Lets admin post a product on a farmer's behalf (team members posting for
-- farmers who don't have time to list themselves). No RLS change needed --
-- products_farmer_write (0002) already lets admin insert/update/delete any
-- product regardless of farmer_id, and every downstream feature (the
-- farmer's own product list, edit, activate/deactivate, orders, chat,
-- marketplace) is scoped purely by farmer_id/user_id, so a product admin
-- creates with farmer_id set to a chosen farmer is immediately and fully
-- that farmer's to manage, same as if they'd listed it themselves.
--
-- created_by just remembers who actually typed it in, for admin's own
-- bookkeeping -- it's never surfaced to farmers/buyers and doesn't gate
-- anything.

alter table public.products add column created_by uuid references public.profiles(id);
