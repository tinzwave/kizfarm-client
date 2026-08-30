-- KIZ FARM: initial Postgres schema (migrated from MongoDB/Mongoose)
-- Phase 1 of the Supabase migration plan: tables + indexes + RLS.
-- RPC functions for money/inventory/status-transition logic land in a later migration.

create extension if not exists pgcrypto;

-- =========================================================================
-- PROFILES (extends auth.users) — was: User.mjs
-- =========================================================================

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null unique,
  phone text,
  role text not null default 'user' check (role in ('user', 'admin', 'farmer')),
  status text not null default 'active' check (status in ('active', 'suspended', 'deactivated')),
  suspension_reason text,
  suspended_at timestamptz,
  profile_image text,
  address text,
  city text,
  state text,
  country text,
  account_balance numeric not null default 0,
  created_at timestamptz not null default now()
);

comment on table public.profiles is 'Buyer/admin/farmer identity, extends auth.users 1:1.';

-- =========================================================================
-- FARMERS — was: Farmer.mjs
-- =========================================================================

create table public.farmers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  full_name text,
  farm_name text,
  phone text not null,
  location text,
  farm_type text,
  farm_address text,
  status text not null default 'draft' check (status in ('draft', 'pending', 'approved', 'rejected')),
  bvn text,
  nin text,
  bvn_url text,
  gov_id_url text,
  selfie_url text,
  farmer_image_url text,
  valid_id_image_url text,
  farm_image_url text,
  farm_image_urls text[] not null default '{}',
  rejection_reason text,
  bank_name text,
  account_holder_name text,
  account_number text,
  branch_code text,
  bank_verified boolean not null default false,
  bank_verified_at timestamptz,
  account_balance numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =========================================================================
-- DRIVERS — was: Driver.mjs (no auth/login; admin-managed records only)
-- current_order_id FK added after ORDERS exists, below (circular reference)
-- =========================================================================

create table public.drivers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null,
  vehicle_type text not null default 'bike' check (vehicle_type in ('bike', 'van', 'truck', 'refrigerated_van')),
  vehicle_plate text,
  vehicle_images text[] not null default '{}',
  current_location text,
  status text not null default 'active' check (status in ('active', 'busy', 'offline')),
  current_order_id uuid,
  total_deliveries integer not null default 0,
  rating_total numeric not null default 0,
  rating_count integer not null default 0,
  average_rating numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =========================================================================
-- PRODUCTS — was: Product.mjs
-- =========================================================================

create table public.products (
  id uuid primary key default gen_random_uuid(),
  farmer_id uuid not null references public.farmers(id) on delete cascade,
  user_id uuid not null references public.profiles(id),
  name text not null,
  description text,
  price numeric not null,
  category text,
  unit text,
  quantity integer,
  moisture_code text,
  images text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index products_farmer_id_idx on public.products(farmer_id);
create index products_category_idx on public.products(category);

-- =========================================================================
-- ORDERS — was: Order.mjs
-- =========================================================================

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  master_order_id text,
  sub_order_index integer not null default 1,
  sub_order_count integer not null default 1,
  buyer_id uuid not null references public.profiles(id),
  farmer_id uuid not null references public.farmers(id),
  driver_id uuid references public.drivers(id),
  subtotal numeric not null,
  delivery_fee numeric not null default 0,
  service_fee numeric not null default 0,
  total numeric not null,
  payment_method text not null default 'card' check (payment_method in ('card', 'bank_transfer', 'mpesa', 'cash_on_delivery')),
  payment_reference text,
  payment_status text not null default 'pending' check (payment_status in ('pending', 'paid', 'failed', 'refunded')),
  paid_at timestamptz,
  stock_adjusted boolean not null default false,
  stock_adjusted_at timestamptz,
  escrow_status text not null default 'pending' check (escrow_status in ('pending', 'released', 'refunded')),
  escrow_released_at timestamptz,
  delivery_label text,
  delivery_street text,
  delivery_city text,
  delivery_state text,
  delivery_phone text,
  status text not null default 'pending' check (status in (
    'awaiting_transport_quote', 'awaiting_payment', 'pending', 'accepted_by_farmer',
    'confirmed', 'packed', 'assigned', 'in_transit', 'delivered',
    'receipt_confirmed', 'completed', 'rejected', 'cancelled'
  )),
  accepted_at timestamptz,
  confirmed_at timestamptz,
  packed_at timestamptz,
  assigned_at timestamptz,
  picked_up_at timestamptz,
  delivered_at timestamptz,
  receipt_confirmed_at timestamptz,
  cancelled_at timestamptz,
  driver_rating integer check (driver_rating between 1 and 5),
  driver_rated_at timestamptz,
  cancellation_reason text,
  farmer_notes text,
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index orders_buyer_id_idx on public.orders(buyer_id);
create index orders_farmer_id_idx on public.orders(farmer_id);
create index orders_master_order_id_idx on public.orders(master_order_id);
create index orders_status_idx on public.orders(status);

-- Now that ORDERS exists, close the circular reference from DRIVERS.
alter table public.drivers
  add constraint drivers_current_order_id_fkey
  foreign key (current_order_id) references public.orders(id);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id),
  name text not null,
  price numeric not null,
  quantity integer not null,
  unit text,
  image text
);

create index order_items_order_id_idx on public.order_items(order_id);

create table public.order_status_notes (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  status text not null,
  note text not null,
  created_at timestamptz not null default now()
);

create index order_status_notes_order_id_idx on public.order_status_notes(order_id);

-- =========================================================================
-- ESCROWS — was: Escrow.mjs
-- =========================================================================

create table public.escrows (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id),
  master_order_id text,
  buyer_id uuid not null references public.profiles(id),
  farmer_id uuid not null references public.farmers(id),
  amount numeric not null,
  currency text not null default 'NGN',
  status text not null default 'pending' check (status in ('pending', 'released', 'refunded', 'disputed')),
  released_at timestamptz,
  refunded_at timestamptz,
  released_by uuid references public.profiles(id),
  release_notes text,
  refund_reason text,
  refunded_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index escrows_order_id_idx on public.escrows(order_id);
create index escrows_farmer_id_idx on public.escrows(farmer_id);
create index escrows_status_idx on public.escrows(status);

-- =========================================================================
-- LEARNING HUB — was: Tutor.mjs, Course.mjs, Subscription.mjs
-- =========================================================================

create table public.tutors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null,
  phone text not null,
  whatsapp text not null,
  image_url text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  price numeric not null check (price >= 0),
  commission numeric not null default 0 check (commission >= 0),
  final_price numeric check (final_price >= 0),
  content text not null,
  tutor_id uuid references public.tutors(id),
  creator_id uuid references public.profiles(id),
  source text not null default 'admin' check (source in ('admin', 'buyer')),
  audience text not null default 'farmers' check (audience in ('farmers', 'all')),
  status text not null default 'approved' check (status in ('pending', 'approved', 'rejected')),
  rejection_reason text,
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index courses_source_idx on public.courses(source);
create index courses_status_idx on public.courses(status);
create index courses_is_published_idx on public.courses(is_published);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id),
  course_id uuid not null references public.courses(id),
  amount numeric not null,
  creator_amount numeric not null default 0,
  commission numeric not null default 0,
  status text not null default 'active' check (status in ('active', 'cancelled')),
  source text not null default 'admin' check (source in ('admin', 'buyer')),
  payout_status text not null default 'not_applicable' check (payout_status in ('pending', 'released', 'not_applicable')),
  released_at timestamptz,
  released_by uuid references public.profiles(id),
  payment_reference text not null,
  paid_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, course_id)
);

create index subscriptions_source_idx on public.subscriptions(source);
create index subscriptions_payout_status_idx on public.subscriptions(payout_status);

-- =========================================================================
-- CHAT — was: Chat.mjs, Message.mjs
-- Chat.farmerId in the old schema stored the farmer's USER id, not the
-- Farmer profile id — preserved here as farmer_id referencing profiles.
-- =========================================================================

create table public.chats (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references public.profiles(id),
  farmer_id uuid not null references public.profiles(id),
  product_id uuid not null references public.products(id),
  last_message text,
  last_message_time timestamptz,
  last_message_sender_id uuid references public.profiles(id),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (buyer_id, farmer_id, product_id)
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null references public.chats(id) on delete cascade,
  sender_id uuid not null references public.profiles(id),
  receiver_id uuid not null references public.profiles(id),
  content text not null,
  message_type text not null default 'text' check (message_type in ('text', 'image', 'file')),
  attachment_url text,
  attachment_type text,
  is_read boolean not null default false,
  read_at timestamptz,
  delivery_status text not null default 'sent' check (delivery_status in ('sent', 'delivered', 'read')),
  created_at timestamptz not null default now()
);

create index messages_chat_id_created_at_idx on public.messages(chat_id, created_at desc);

-- =========================================================================
-- CART, ADDRESSES, REVIEWS, BLOG — straightforward CRUD tables
-- =========================================================================

create table public.carts (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  items jsonb not null default '[]',
  last_modified timestamptz not null default now()
);

create table public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  label text not null default 'Home',
  street text not null,
  city text not null,
  state text not null,
  country text not null default 'Nigeria',
  phone text,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  buyer_id uuid not null references public.profiles(id),
  order_id uuid references public.orders(id),
  rating integer not null check (rating between 1 and 5),
  comment text not null default '',
  buyer_name text not null default 'Anonymous',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, buyer_id)
);

create table public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  summary text,
  content text not null,
  cover_image text,
  category text not null default 'General',
  read_time integer not null default 5,
  status text not null default 'published' check (status in ('draft', 'published')),
  author text not null default 'KizFarm Admin',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =========================================================================
-- LEDGERS — were embedded arrays on User/Farmer, now child tables
-- =========================================================================

create table public.refund_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  order_id uuid not null references public.orders(id),
  escrow_id uuid references public.escrows(id),
  amount numeric not null,
  reason text,
  refunded_at timestamptz not null default now()
);

create table public.course_payout_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  subscription_id uuid not null references public.subscriptions(id),
  course_id uuid not null references public.courses(id),
  amount numeric not null,
  released_at timestamptz not null default now(),
  released_by uuid references public.profiles(id)
);

create table public.released_funds_ledger (
  id uuid primary key default gen_random_uuid(),
  farmer_id uuid not null references public.farmers(id) on delete cascade,
  order_id uuid not null references public.orders(id),
  escrow_id uuid not null references public.escrows(id),
  amount numeric not null,
  released_at timestamptz not null default now(),
  released_by uuid references public.profiles(id),
  notes text
);

-- =========================================================================
-- AUTH GLUE: auto-create a profile row on signup, admin-role helper
-- =========================================================================

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, name, phone)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'phone'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Prevent a non-admin from self-elevating role/status via a direct UPDATE
-- on their own profile row (RLS lets users update their own row for
-- convenience fields; this trigger silently pins role/status back to their
-- prior value unless the caller is the service_role or already admin).
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
  end if;
  return new;
end;
$$;

create trigger profiles_protect_privileged_columns
  before update on public.profiles
  for each row execute function public.protect_profile_privileged_columns();
