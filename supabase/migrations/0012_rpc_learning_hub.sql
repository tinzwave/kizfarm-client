-- Learning hub — port of learning.mjs.
--
-- Most of learning.mjs needs NO new RPCs: tutors/courses reads are public
-- via existing RLS (0002), admin course creation and buyer course
-- creation/editing are already covered by the courses_insert/courses_update
-- policies from 0002 (admin has unconditional write via is_admin() in
-- those policies' WITH CHECK, so admin review could even be a raw client
-- PATCH -- built as an RPC anyway so finalPrice = price + commission is
-- always computed server-side rather than trusted from the client).
--
-- One correctness note: the original webhook's subscription-activation
-- branch matched on Subscription.paymentReference, but no code path ever
-- created a subscription row with a reference set *before* payment
-- completed -- the only writer was the same route that activates on
-- success. That branch could never have matched anything in production,
-- so it's not being ported; course purchase confirmation happens only
-- through the direct verify-then-activate path below (same as the
-- original's primary path).

create or replace function public.admin_review_buyer_course(
  p_course_id uuid,
  p_approved boolean,
  p_commission numeric default 0,
  p_rejection_reason text default null
)
returns public.courses
language plpgsql
security definer
set search_path = public
as $$
declare
  v_course public.courses%rowtype;
  v_commission numeric;
begin
  if not public.is_admin() then
    raise exception 'Admin required' using errcode = '42501';
  end if;

  select * into v_course from public.courses where id = p_course_id and source = 'buyer' for update;
  if not found then
    raise exception 'Buyer course not found' using errcode = 'P0001';
  end if;

  v_commission := coalesce(p_commission, 0);
  if v_commission < 0 then
    raise exception 'Commission cannot reduce the buyer''s price' using errcode = 'P0001';
  end if;

  update public.courses set
    status = case when p_approved then 'approved' else 'rejected' end,
    commission = case when p_approved then v_commission else 0 end,
    final_price = case when p_approved then price + v_commission else price end,
    is_published = p_approved,
    rejection_reason = case when p_approved then null else coalesce(nullif(trim(p_rejection_reason), ''), 'Rejected by admin. Please update the course and resubmit.') end,
    reviewed_by = auth.uid(),
    reviewed_at = now()
  where id = p_course_id
  returning * into v_course;

  return v_course;
end;
$$;
grant execute on function public.admin_review_buyer_course(uuid, boolean, numeric, text) to authenticated;

-- Internal only: called by the purchase-course Edge Function *after*
-- Paystack verification, same trusted-caller pattern as pay_order.
create or replace function public.activate_subscription(
  p_user_id uuid,
  p_course_id uuid,
  p_payment_reference text
)
returns public.subscriptions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_course public.courses%rowtype;
  v_amount numeric;
  v_creator_amount numeric := 0;
  v_commission numeric := 0;
  v_payout_status text := 'not_applicable';
  v_sub public.subscriptions%rowtype;
begin
  select * into v_course from public.courses where id = p_course_id;
  if not found then
    raise exception 'Course not found' using errcode = 'P0001';
  end if;
  if not v_course.is_published then
    raise exception 'Course is not available for purchase' using errcode = 'P0001';
  end if;
  if v_course.source = 'buyer' and v_course.creator_id = p_user_id then
    raise exception 'You cannot subscribe to a course you created' using errcode = 'P0001';
  end if;

  v_amount := case when v_course.source = 'buyer' then coalesce(v_course.final_price, v_course.price) else v_course.price end;

  if v_course.source = 'buyer' then
    v_creator_amount := v_course.price;
    v_commission := coalesce(v_course.commission, 0);
    v_payout_status := 'pending';
  end if;

  insert into public.subscriptions (
    user_id, course_id, amount, creator_amount, commission, source, payout_status, status, payment_reference, paid_at
  ) values (
    p_user_id, p_course_id, v_amount, v_creator_amount, v_commission, v_course.source, v_payout_status, 'active', p_payment_reference, now()
  )
  on conflict (user_id, course_id) do update set
    amount = excluded.amount, creator_amount = excluded.creator_amount, commission = excluded.commission,
    source = excluded.source, payout_status = excluded.payout_status, status = 'active',
    payment_reference = excluded.payment_reference, paid_at = now()
  returning * into v_sub;

  return v_sub;
end;
$$;
revoke execute on function public.activate_subscription(uuid, uuid, text) from anon, authenticated;

-- Public, admin-only: matches POST /admin/course-purchases/:id/release-payout.
create or replace function public.release_course_payout(p_subscription_id uuid)
returns public.subscriptions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sub public.subscriptions%rowtype;
  v_course public.courses%rowtype;
  v_creator_amount numeric;
begin
  if not public.is_admin() then
    raise exception 'Admin required' using errcode = '42501';
  end if;

  select * into v_sub from public.subscriptions where id = p_subscription_id and source = 'buyer' and status = 'active' for update;
  if not found then
    raise exception 'Course purchase not found' using errcode = 'P0001';
  end if;
  if v_sub.payout_status = 'released' then
    raise exception 'Payout has already been released' using errcode = 'P0001';
  end if;

  select * into v_course from public.courses where id = v_sub.course_id;
  if v_course.creator_id is null then
    raise exception 'Course creator is missing' using errcode = 'P0001';
  end if;

  v_creator_amount := coalesce(v_sub.creator_amount, v_course.price, 0);

  update public.subscriptions
    set payout_status = 'released', released_at = now(), released_by = auth.uid()
    where id = p_subscription_id
    returning * into v_sub;

  update public.profiles set account_balance = account_balance + v_creator_amount where id = v_course.creator_id;

  insert into public.course_payout_ledger (user_id, subscription_id, course_id, amount, released_at, released_by)
  values (v_course.creator_id, p_subscription_id, v_course.id, v_creator_amount, v_sub.released_at, auth.uid());

  return v_sub;
end;
$$;
grant execute on function public.release_course_payout(uuid) to authenticated;
