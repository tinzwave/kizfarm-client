-- =========================================================================
-- COURSE COVER IMAGE
-- =========================================================================

alter table public.courses add column cover_image text;

-- =========================================================================
-- COURSE REVIEWS
-- =========================================================================
-- Mirrors public.reviews (product reviews) but for courses. Kept as a
-- separate table rather than widening the product reviews table, since the
-- eligibility rule is different (must hold an active subscription, not an
-- order) and the two shouldn't be joined together in one query surface.

create table public.course_reviews (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  buyer_id uuid not null references public.profiles(id),
  rating integer not null check (rating between 1 and 5),
  comment text not null default '',
  buyer_name text not null default 'Anonymous',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (course_id, buyer_id)
);

create index course_reviews_course_id_idx on public.course_reviews (course_id);

alter table public.course_reviews enable row level security;

-- Readable by anyone -- same as product reviews, reviews are public marketing content.
create policy course_reviews_select_all
  on public.course_reviews for select
  using (true);

-- Only a buyer with an active subscription to the course can review it, and
-- only under their own name/id -- mirrors the "must have ordered it" rule
-- product reviews use, just checked against subscriptions instead of orders.
create policy course_reviews_insert_subscribed
  on public.course_reviews for insert
  with check (
    auth.uid() = buyer_id
    and exists (
      select 1 from public.subscriptions
      where subscriptions.course_id = course_reviews.course_id
        and subscriptions.user_id = auth.uid()
        and subscriptions.status = 'active'
    )
  );

create policy course_reviews_update_own
  on public.course_reviews for update
  using (auth.uid() = buyer_id)
  with check (auth.uid() = buyer_id);

create policy course_reviews_delete_own
  on public.course_reviews for delete
  using (auth.uid() = buyer_id);

grant select, insert, update, delete on public.course_reviews to authenticated;
grant select on public.course_reviews to anon;
