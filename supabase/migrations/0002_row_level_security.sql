-- KIZ FARM: Row-Level Security policies.
--
-- Strategy (per the migration plan):
--   1. Money/inventory/status-transition tables (orders, order_items,
--      order_status_notes, escrows, the three ledger tables, subscriptions)
--      get RLS enabled with SELECT-only policies and NO write policies at
--      all for the `anon`/`authenticated` roles. All writes to these tables
--      happen through SECURITY DEFINER RPC functions (added in a later
--      migration), which run as the function owner and bypass RLS.
--   2. Plain CRUD tables (products, addresses, cart, reviews, chat
--      messages, blog reads, tutors/courses reads) get ordinary
--      owner/public policies — both frontends call these directly.
--   3. Two tables are a mix of "self-editable" and "privileged" columns
--      (profiles: role/status; farmers: status/account_balance) — those
--      keep an ordinary self-editable UPDATE policy, but a BEFORE UPDATE
--      trigger (added in migration 0001) pins the privileged columns back
--      to their old value unless the caller is admin or service_role.
--   4. Farmer KYC/bank fields are sensitive and stay owner+admin only; a
--      public view (`farmer_public_profile`) exposes just the safe columns
--      (name, location) for marketplace listings.

alter table public.profiles enable row level security;
alter table public.farmers enable row level security;
alter table public.drivers enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_status_notes enable row level security;
alter table public.escrows enable row level security;
alter table public.tutors enable row level security;
alter table public.courses enable row level security;
alter table public.subscriptions enable row level security;
alter table public.chats enable row level security;
alter table public.messages enable row level security;
alter table public.carts enable row level security;
alter table public.addresses enable row level security;
alter table public.reviews enable row level security;
alter table public.blog_posts enable row level security;
alter table public.refund_ledger enable row level security;
alter table public.course_payout_ledger enable row level security;
alter table public.released_funds_ledger enable row level security;

-- =========================================================================
-- PROFILES
-- =========================================================================

-- Visible to: yourself, admin, or a counterparty you share an order/chat
-- with (mirrors today's Express `populate("buyerId"/"farmerId", "name
-- email phone")` on order/chat routes — this is not a wider exposure than
-- today, just expressed as a policy instead of a route-by-route populate).
create or replace function public.can_view_profile(target_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select
    auth.uid() = target_id
    or public.is_admin()
    or exists (
      select 1 from public.orders o
      join public.farmers f on f.id = o.farmer_id
      where (o.buyer_id = auth.uid() and f.user_id = target_id)
         or (f.user_id = auth.uid() and o.buyer_id = target_id)
    )
    or exists (
      select 1 from public.chats c
      where (c.buyer_id = auth.uid() and c.farmer_id = target_id)
         or (c.farmer_id = auth.uid() and c.buyer_id = target_id)
    );
$$;

create policy profiles_select on public.profiles
  for select using (public.can_view_profile(id));

-- Self (or admin) can update; the 0001 trigger pins role/status/balance
-- back unless the caller is admin/service_role.
create policy profiles_update on public.profiles
  for update using (auth.uid() = id or public.is_admin())
  with check (auth.uid() = id or public.is_admin());

-- No INSERT/DELETE policy: rows are created only by the on_auth_user_created
-- trigger and never deleted directly (cascades from auth.users deletion).

-- =========================================================================
-- FARMERS
-- =========================================================================

create view public.farmer_public_profile as
select id, farm_name, location, status
from public.farmers;

grant select on public.farmer_public_profile to anon, authenticated;

create policy farmers_select on public.farmers
  for select using (auth.uid() = user_id or public.is_admin());

create policy farmers_insert on public.farmers
  for insert with check (auth.uid() = user_id);

-- Self-editable (name, farm details, KYC doc URLs, bank details); the 0001
-- trigger pins status/rejection_reason/account_balance for non-admins.
-- Admin approval/rejection still goes through the admin_review_farmer RPC
-- (not a raw UPDATE) because it must also flip profiles.role atomically.
create policy farmers_update on public.farmers
  for update using (auth.uid() = user_id or public.is_admin())
  with check (auth.uid() = user_id or public.is_admin());

create or replace function public.protect_farmer_privileged_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() <> 'service_role' and not public.is_admin() then
    new.status := old.status;
    new.rejection_reason := old.rejection_reason;
    new.account_balance := old.account_balance;
  end if;
  return new;
end;
$$;

create trigger farmers_protect_privileged_columns
  before update on public.farmers
  for each row execute function public.protect_farmer_privileged_columns();

-- =========================================================================
-- DRIVERS — admin-managed only; readable by any signed-in user (buyers/
-- farmers need to see the driver assigned to their order).
-- =========================================================================

create policy drivers_select on public.drivers
  for select using (auth.role() = 'authenticated');

create policy drivers_admin_write on public.drivers
  for all using (public.is_admin()) with check (public.is_admin());

-- =========================================================================
-- PRODUCTS — public marketplace read; farmer owns their own rows.
-- =========================================================================

create policy products_select on public.products
  for select using (true);

create policy products_farmer_write on public.products
  for all using (
    exists (select 1 from public.farmers f where f.id = farmer_id and f.user_id = auth.uid())
    or public.is_admin()
  )
  with check (
    exists (select 1 from public.farmers f where f.id = farmer_id and f.user_id = auth.uid())
    or public.is_admin()
  );

-- =========================================================================
-- ORDERS / ORDER_ITEMS / ORDER_STATUS_NOTES / ESCROWS / LEDGERS
-- Read-only for owners/admin. No write policies: every mutation goes
-- through a SECURITY DEFINER RPC (added in a later migration).
-- =========================================================================

create policy orders_select on public.orders
  for select using (
    buyer_id = auth.uid()
    or exists (select 1 from public.farmers f where f.id = farmer_id and f.user_id = auth.uid())
    or public.is_admin()
  );

create policy order_items_select on public.order_items
  for select using (
    exists (
      select 1 from public.orders o
      where o.id = order_id
        and (o.buyer_id = auth.uid()
             or exists (select 1 from public.farmers f where f.id = o.farmer_id and f.user_id = auth.uid())
             or public.is_admin())
    )
  );

create policy order_status_notes_select on public.order_status_notes
  for select using (
    exists (
      select 1 from public.orders o
      where o.id = order_id
        and (o.buyer_id = auth.uid()
             or exists (select 1 from public.farmers f where f.id = o.farmer_id and f.user_id = auth.uid())
             or public.is_admin())
    )
  );

create policy escrows_select on public.escrows
  for select using (
    buyer_id = auth.uid()
    or exists (select 1 from public.farmers f where f.id = farmer_id and f.user_id = auth.uid())
    or public.is_admin()
  );

create policy refund_ledger_select on public.refund_ledger
  for select using (user_id = auth.uid() or public.is_admin());

create policy course_payout_ledger_select on public.course_payout_ledger
  for select using (user_id = auth.uid() or public.is_admin());

create policy released_funds_ledger_select on public.released_funds_ledger
  for select using (
    exists (select 1 from public.farmers f where f.id = farmer_id and f.user_id = auth.uid())
    or public.is_admin()
  );

-- =========================================================================
-- LEARNING HUB — tutors/courses readable per current public routes;
-- subscriptions are payment-gated (RPC-only writes).
-- =========================================================================

create policy tutors_select on public.tutors for select using (true);
create policy tutors_admin_write on public.tutors
  for all using (public.is_admin()) with check (public.is_admin());

create policy courses_select on public.courses
  for select using (is_published = true or creator_id = auth.uid() or public.is_admin());

create policy courses_insert on public.courses
  for insert with check (
    (public.is_admin() and source = 'admin')
    or (source = 'buyer' and creator_id = auth.uid() and status = 'pending' and is_published = false)
  );

create policy courses_update on public.courses
  for update
  using (public.is_admin() or (source = 'buyer' and creator_id = auth.uid()))
  with check (
    public.is_admin()
    or (source = 'buyer' and creator_id = auth.uid() and status = 'pending' and is_published = false)
  );

-- No write policy on subscriptions: created/updated only by the
-- purchase_course / release_course_payout RPCs.
create policy subscriptions_select on public.subscriptions
  for select using (user_id = auth.uid() or public.is_admin());

-- =========================================================================
-- CHAT — participants only.
-- =========================================================================

create policy chats_select on public.chats
  for select using (buyer_id = auth.uid() or farmer_id = auth.uid() or public.is_admin());

create policy chats_insert on public.chats
  for insert with check (buyer_id = auth.uid());

create policy messages_select on public.messages
  for select using (
    exists (
      select 1 from public.chats c
      where c.id = chat_id and (c.buyer_id = auth.uid() or c.farmer_id = auth.uid())
    )
    or public.is_admin()
  );

create policy messages_insert on public.messages
  for insert with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.chats c
      where c.id = chat_id and (c.buyer_id = auth.uid() or c.farmer_id = auth.uid())
    )
  );

create policy messages_update_read_receipt on public.messages
  for update using (receiver_id = auth.uid()) with check (receiver_id = auth.uid());

-- =========================================================================
-- CART, ADDRESSES, REVIEWS, BLOG
-- =========================================================================

create policy carts_owner on public.carts
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy addresses_owner on public.addresses
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy reviews_select on public.reviews for select using (true);
create policy reviews_write on public.reviews
  for all using (buyer_id = auth.uid() or public.is_admin())
  with check (buyer_id = auth.uid());

create policy blog_posts_select on public.blog_posts
  for select using (status = 'published' or public.is_admin());
create policy blog_posts_admin_write on public.blog_posts
  for all using (public.is_admin()) with check (public.is_admin());
