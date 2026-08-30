-- =========================================================================
-- WISHLISTS
-- =========================================================================
-- Buyer-owned favorites list. Simple owner-only table: a buyer can
-- add/remove/list their own rows, nothing else. No admin/public access
-- needed since this is purely a personal buyer convenience feature.

create table public.wishlists (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references public.profiles(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (buyer_id, product_id)
);

create index wishlists_buyer_id_idx on public.wishlists (buyer_id);

alter table public.wishlists enable row level security;

create policy wishlists_select_own
  on public.wishlists for select
  using (auth.uid() = buyer_id);

create policy wishlists_insert_own
  on public.wishlists for insert
  with check (auth.uid() = buyer_id);

create policy wishlists_delete_own
  on public.wishlists for delete
  using (auth.uid() = buyer_id);

grant select, insert, delete on public.wishlists to authenticated;
