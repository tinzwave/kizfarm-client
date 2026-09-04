-- Referral program.
--
-- Mechanics (per product decision, not derivable from code):
--   - Every profile gets a referral_code at signup. Signing up with someone
--     else's code (?ref=CODE, passed through as auth signUp metadata, same
--     passthrough already used for name/phone) links referred_by and
--     creates a `referrals` row.
--   - Two reward events per referred person, both worth the same
--     admin-configurable flat amount (`referral_settings.reward_amount`):
--       1. `signup`         — fires once, when the referral link is made.
--       2. `first_purchase` — fires once, on the referred person's first
--          ever paid product order (not courses, not repeat purchases).
--     A referred person who both signs up and buys nets the referrer double
--     the base amount, matching the two separate reward rows.
--   - Rewards accrue as 'pending' regardless of threshold. Admin can only
--     release (credit account_balance) a referrer's pending rewards once
--     that referrer has referred_settings.min_referrals_for_payout people
--     (default 5) -- this gates payout, not accrual. Release is a manual,
--     per-referrer admin action (weekly, per the client), not automatic --
--     admin reviews the referral counts/amounts and decides before paying.

-- =========================================================================
-- SCHEMA
-- =========================================================================

alter table public.profiles add column referral_code text unique;
alter table public.profiles add column referred_by uuid references public.profiles(id);

create table public.referral_settings (
  id boolean primary key default true check (id),
  reward_amount numeric not null default 100 check (reward_amount >= 0),
  min_referrals_for_payout integer not null default 5 check (min_referrals_for_payout >= 0),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id)
);
insert into public.referral_settings (id) values (true);

comment on table public.referral_settings is 'Singleton (id always true) — admin-editable referral reward rate + payout threshold.';

create table public.referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references public.profiles(id) on delete cascade,
  referred_id uuid not null unique references public.profiles(id) on delete cascade,
  first_purchase_rewarded boolean not null default false,
  created_at timestamptz not null default now()
);
create index referrals_referrer_id_idx on public.referrals(referrer_id);

create table public.referral_rewards (
  id uuid primary key default gen_random_uuid(),
  referral_id uuid not null references public.referrals(id) on delete cascade,
  referrer_id uuid not null references public.profiles(id) on delete cascade,
  reward_type text not null check (reward_type in ('signup', 'first_purchase')),
  amount numeric not null,
  status text not null default 'pending' check (status in ('pending', 'released')),
  created_at timestamptz not null default now(),
  released_at timestamptz,
  released_by uuid references public.profiles(id)
);
create index referral_rewards_referrer_id_idx on public.referral_rewards(referrer_id);
create index referral_rewards_status_idx on public.referral_rewards(status);

-- =========================================================================
-- RLS — same shape as the other ledger tables (0002): SELECT-only for
-- clients, all writes go through the SECURITY DEFINER functions below.
-- =========================================================================

alter table public.referral_settings enable row level security;
alter table public.referrals enable row level security;
alter table public.referral_rewards enable row level security;

create policy referral_settings_select on public.referral_settings for select using (true);

create policy referrals_select on public.referrals
  for select using (referrer_id = auth.uid() or referred_id = auth.uid() or public.is_admin());

create policy referral_rewards_select on public.referral_rewards
  for select using (referrer_id = auth.uid() or public.is_admin());

-- Referrer and referred person need to see each other's profile (name) on
-- the referrals page even without a shared order/chat yet.
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
    )
    or exists (
      select 1 from public.referrals r
      where (r.referrer_id = auth.uid() and r.referred_id = target_id)
         or (r.referred_id = auth.uid() and r.referrer_id = target_id)
    );
$$;

-- referred_by/referral_code must only ever be set by handle_new_user --
-- otherwise a self-update could fabricate a referral relationship after
-- the fact (RLS already lets a user UPDATE their own profile row).
create or replace function public.protect_profile_privileged_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() <> 'service_role' and not public.is_admin() then
    new.role := old.role;
    new.status := old.status;
    new.suspension_reason := old.suspension_reason;
    new.suspended_at := old.suspended_at;
    new.account_balance := old.account_balance;
    new.referred_by := old.referred_by;
    new.referral_code := old.referral_code;
  end if;
  return new;
end;
$$;

-- =========================================================================
-- SIGNUP: generate a code for every profile, and consume one on the way in.
-- =========================================================================

create or replace function public.generate_referral_code()
returns text
language plpgsql
as $$
declare
  v_code text;
begin
  loop
    v_code := upper(substr(md5(gen_random_uuid()::text), 1, 7));
    exit when not exists (select 1 from public.profiles where referral_code = v_code);
  end loop;
  return v_code;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ref_code text;
  v_referrer_id uuid;
  v_reward_amount numeric;
  v_referral public.referrals%rowtype;
begin
  insert into public.profiles (id, email, name, phone, referral_code)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'phone',
    public.generate_referral_code()
  );

  v_ref_code := upper(nullif(trim(new.raw_user_meta_data->>'ref_code'), ''));
  if v_ref_code is not null then
    select id into v_referrer_id from public.profiles where referral_code = v_ref_code;

    if v_referrer_id is not null and v_referrer_id <> new.id then
      update public.profiles set referred_by = v_referrer_id where id = new.id;

      insert into public.referrals (referrer_id, referred_id)
      values (v_referrer_id, new.id)
      returning * into v_referral;

      select reward_amount into v_reward_amount from public.referral_settings where id = true;

      insert into public.referral_rewards (referral_id, referrer_id, reward_type, amount)
      values (v_referral.id, v_referrer_id, 'signup', coalesce(v_reward_amount, 0));
    end if;
  end if;

  return new;
end;
$$;

-- =========================================================================
-- FIRST-PURCHASE BONUS: hooked into pay_order, the single choke point both
-- verify-and-pay-order and the Paystack webhook call after a product order
-- is actually paid (see 0006). Rebuilt on top of the 0020 anti-replay
-- version (payment_reference must match what was already stashed on the
-- order, and payment_reference is no longer overwritten here) -- NOT the
-- older 0006 shape, so this doesn't silently reopen that hole.
-- =========================================================================

create or replace function public.pay_order(
  p_order_id uuid,
  p_payment_reference text,
  p_payment_method text default null
)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
  v_referral public.referrals%rowtype;
  v_reward_amount numeric;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'Order not found' using errcode = 'P0001';
  end if;

  if v_order.payment_status = 'paid' then
    return v_order; -- already paid: idempotent no-op for double-fire (webhook + client both succeeding)
  end if;

  if v_order.payment_reference is distinct from p_payment_reference then
    raise exception 'Payment reference does not match this order' using errcode = 'P0001';
  end if;

  update public.orders
    set payment_status = 'paid', paid_at = now(), status = 'pending',
        payment_method = coalesce(p_payment_method, payment_method),
        admin_notes = 'Payment completed. Order is now awaiting farmer confirmation.'
    where id = p_order_id
    returning * into v_order;

  insert into public.order_status_notes (order_id, status, note)
  values (p_order_id, 'pending', 'Payment completed via webhook/verification.');

  perform public.decrement_stock_for_order(p_order_id);

  insert into public.escrows (order_id, master_order_id, buyer_id, farmer_id, amount, status)
  select v_order.id, v_order.master_order_id, v_order.buyer_id, v_order.farmer_id, v_order.total, 'pending'
  where not exists (select 1 from public.escrows where order_id = v_order.id);

  -- First-purchase referral bonus: pays out once, ever, per referred buyer.
  -- The UPDATE...RETURNING flips the flag under a row lock, so sibling
  -- sub-orders from the same split checkout (one pay_order call each) can't
  -- both see first_purchase_rewarded = false and double-pay it.
  update public.referrals set first_purchase_rewarded = true
    where referred_id = v_order.buyer_id and first_purchase_rewarded = false
    returning * into v_referral;

  if found then
    select reward_amount into v_reward_amount from public.referral_settings where id = true;
    insert into public.referral_rewards (referral_id, referrer_id, reward_type, amount)
    values (v_referral.id, v_referral.referrer_id, 'first_purchase', coalesce(v_reward_amount, 0));
  end if;

  return v_order;
end;
$$;

revoke execute on function public.pay_order(uuid, text, text) from anon, authenticated;

-- =========================================================================
-- ADMIN
-- =========================================================================

create or replace function public.admin_update_referral_settings(p_reward_amount numeric, p_min_referrals integer)
returns public.referral_settings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_settings public.referral_settings%rowtype;
begin
  if not public.is_admin() then
    raise exception 'Admin required' using errcode = '42501';
  end if;
  if p_reward_amount is null or p_reward_amount < 0 then
    raise exception 'Reward amount must be zero or positive' using errcode = 'P0001';
  end if;
  if p_min_referrals is null or p_min_referrals < 0 then
    raise exception 'Minimum referrals must be zero or positive' using errcode = 'P0001';
  end if;

  update public.referral_settings
    set reward_amount = p_reward_amount, min_referrals_for_payout = p_min_referrals,
        updated_at = now(), updated_by = auth.uid()
    where id = true
    returning * into v_settings;

  return v_settings;
end;
$$;
grant execute on function public.admin_update_referral_settings(numeric, integer) to authenticated;

-- Releases ALL of one referrer's pending rewards at once (admin pays them
-- their accumulated total in a single weekly transfer, then marks it paid
-- here) -- gated on the referral-count threshold.
create or replace function public.admin_release_referral_rewards(p_referrer_id uuid)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  v_min_referrals integer;
  v_referral_count integer;
  v_total numeric;
begin
  if not public.is_admin() then
    raise exception 'Admin required' using errcode = '42501';
  end if;

  select min_referrals_for_payout into v_min_referrals from public.referral_settings where id = true;
  select count(*) into v_referral_count from public.referrals where referrer_id = p_referrer_id;

  if v_referral_count < coalesce(v_min_referrals, 0) then
    raise exception 'Referrer has % referral(s), needs at least %', v_referral_count, v_min_referrals using errcode = 'P0001';
  end if;

  select coalesce(sum(amount), 0) into v_total
  from public.referral_rewards where referrer_id = p_referrer_id and status = 'pending';

  if v_total <= 0 then
    raise exception 'No pending referral rewards for this referrer' using errcode = 'P0001';
  end if;

  update public.referral_rewards
    set status = 'released', released_at = now(), released_by = auth.uid()
    where referrer_id = p_referrer_id and status = 'pending';

  update public.profiles set account_balance = account_balance + v_total where id = p_referrer_id;

  return v_total;
end;
$$;
grant execute on function public.admin_release_referral_rewards(uuid) to authenticated;
