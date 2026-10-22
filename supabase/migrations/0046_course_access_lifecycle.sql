-- =========================================================================
-- Course access lifecycle: 30-day access, renewals, creator sales view,
-- payout notifications and expiry reminders.
--
-- Until now a subscription never expired, and every course list hid the
-- courses the viewer had bought, so a purchased course looked like it had
-- vanished. Access now lasts course_access_days() from payment:
--
--   * subscriptions.expires_at is the single source of truth for access;
--     status stays 'active' (no CHECK change) and "expired" is simply
--     expires_at <= now(), so nothing has to flip it on time.
--   * Renewing extends from the current expiry if access hasn't run out
--     yet, otherwise from now.
--   * A renewal while the creator's payout from the previous payment is
--     still pending adds to it instead of overwriting it -- one row per
--     buyer+course means the earlier, unreleased amount would otherwise be
--     lost.
--
-- Expiry emails are sent by the course-expiry-notices Edge Function, run
-- daily by pg_cron. It reads two vault secrets, set once outside
-- migrations (until they exist the job does nothing):
--   course_expiry_function_url  https://<project>.supabase.co/functions/v1/course-expiry-notices
--   course_cron_secret          shared secret, also set as COURSE_CRON_SECRET
--                               on the course-expiry-notices function
-- =========================================================================

create or replace function public.course_access_days()
returns integer
language sql immutable as $$ select 30 $$;

-- Renewal opens this many days before access ends (and stays open after).
create or replace function public.course_renewal_window_days()
returns integer
language sql immutable as $$ select 3 $$;

alter table public.subscriptions
  add column expires_at timestamptz,
  add column expiry_reminder_sent_at timestamptz,
  add column expired_notice_sent_at timestamptz;

update public.subscriptions
  set expires_at = paid_at + make_interval(days => public.course_access_days())
  where expires_at is null;

alter table public.subscriptions
  alter column expires_at set default now() + make_interval(days => public.course_access_days()),
  alter column expires_at set not null;

create index subscriptions_expires_at_idx on public.subscriptions (expires_at) where status = 'active';
create index subscriptions_course_id_idx on public.subscriptions (course_id);

-- -------------------------------------------------------------------------
-- Activation / renewal
-- -------------------------------------------------------------------------

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
  v_existing public.subscriptions%rowtype;
  v_has_existing boolean;
  v_starts timestamptz := now();
  v_sub public.subscriptions%rowtype;
begin
  select * into v_existing from public.subscriptions
    where user_id = p_user_id and course_id = p_course_id
    for update;
  v_has_existing := found;
  if v_has_existing and v_existing.status = 'active' and v_existing.payment_reference = p_payment_reference then
    return v_existing; -- already activated by this exact payment: idempotent no-op for double-fire (client + webhook)
  end if;

  if (select status from public.profiles where id = p_user_id) <> 'active' then
    raise exception 'This account is not active. Please contact support.' using errcode = '42501';
  end if;

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

  if v_has_existing and v_existing.status = 'active' and v_existing.expires_at > now() then
    v_starts := v_existing.expires_at; -- early renewal: don't swallow the days already paid for
  end if;

  insert into public.subscriptions (
    user_id, course_id, amount, creator_amount, commission, source, payout_status, status,
    payment_reference, paid_at, expires_at
  ) values (
    p_user_id, p_course_id, v_amount, v_creator_amount, v_commission, v_course.source, v_payout_status, 'active',
    p_payment_reference, now(), v_starts + make_interval(days => public.course_access_days())
  )
  on conflict (user_id, course_id) do update set
    -- An unreleased payout from the previous payment is carried forward.
    amount = case when subscriptions.payout_status = 'pending' and excluded.payout_status = 'pending'
      then subscriptions.amount + excluded.amount else excluded.amount end,
    creator_amount = case when subscriptions.payout_status = 'pending' and excluded.payout_status = 'pending'
      then subscriptions.creator_amount + excluded.creator_amount else excluded.creator_amount end,
    commission = case when subscriptions.payout_status = 'pending' and excluded.payout_status = 'pending'
      then subscriptions.commission + excluded.commission else excluded.commission end,
    source = excluded.source,
    payout_status = excluded.payout_status,
    released_at = case when excluded.payout_status = 'pending' then null else subscriptions.released_at end,
    released_by = case when excluded.payout_status = 'pending' then null else subscriptions.released_by end,
    status = 'active',
    payment_reference = excluded.payment_reference,
    paid_at = now(),
    expires_at = excluded.expires_at,
    expiry_reminder_sent_at = null,
    expired_notice_sent_at = null
  -- Two first-time activations racing (client + webhook, no row to lock
  -- yet): the loser must not add the same payment to the payout twice.
  where subscriptions.payment_reference <> excluded.payment_reference
  returning * into v_sub;

  if v_sub.id is null then
    select * into v_sub from public.subscriptions where user_id = p_user_id and course_id = p_course_id;
  end if;

  return v_sub;
end;
$$;
revoke execute on function public.activate_subscription(uuid, uuid, text) from public, anon, authenticated;

-- -------------------------------------------------------------------------
-- Access gates now honour expires_at
-- -------------------------------------------------------------------------

create or replace function public.get_course_content(p_course_id uuid)
returns text
language plpgsql security definer set search_path = public as $$
declare v_content text; v_creator uuid;
begin
  select content, creator_id into v_content, v_creator from public.courses where id = p_course_id;
  if not found then raise exception 'Course not found' using errcode = 'P0001'; end if;

  if public.is_admin()
    or v_creator = auth.uid()
    or exists (
      select 1 from public.subscriptions
      where course_id = p_course_id and user_id = auth.uid() and status = 'active' and expires_at > now()
    )
  then
    return v_content;
  end if;

  raise exception 'Access denied' using errcode = '42501';
end; $$;
grant execute on function public.get_course_content(uuid) to authenticated;

-- WhatsApp guidance runs for the same period as course access.
create or replace function public.get_course_creator_contact(p_course_id uuid)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_whatsapp text;
  v_creator uuid;
  v_until timestamptz;
begin
  select creator_whatsapp, creator_id into v_whatsapp, v_creator
  from public.courses where id = p_course_id;
  if not found then raise exception 'Course not found' using errcode = 'P0001'; end if;

  if public.is_admin() or v_creator = auth.uid() then
    return jsonb_build_object('whatsapp', v_whatsapp, 'accessUntil', null, 'expired', false);
  end if;

  select expires_at into v_until from public.subscriptions
  where course_id = p_course_id and user_id = auth.uid() and status = 'active';
  if not found then raise exception 'Access denied' using errcode = '42501'; end if;

  if now() > v_until then
    return jsonb_build_object('whatsapp', null, 'accessUntil', v_until, 'expired', true);
  end if;
  return jsonb_build_object('whatsapp', v_whatsapp, 'accessUntil', v_until, 'expired', false);
end; $$;
grant execute on function public.get_course_creator_contact(uuid) to authenticated;

-- -------------------------------------------------------------------------
-- Creator view: who subscribed to my courses, and has my payout been
-- released. Creators can't read other users' subscriptions or profiles
-- through RLS, so this returns only what they need: the subscriber's name
-- (never email/phone), dates, and payout state.
-- -------------------------------------------------------------------------

create or replace function public.get_my_course_sales()
returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'sales', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', s.id,
        'courseId', s.course_id,
        'subscriberName', coalesce(nullif(trim(p.name), ''), 'KIZ FARM member'),
        'paidAt', s.paid_at,
        'expiresAt', s.expires_at,
        'creatorAmount', s.creator_amount,
        'payoutStatus', s.payout_status,
        'releasedAt', s.released_at
      ) order by s.paid_at desc)
      from public.subscriptions s
      join public.courses c on c.id = s.course_id
      left join public.profiles p on p.id = s.user_id
      where c.creator_id = auth.uid() and c.source = 'buyer' and s.status = 'active'
    ), '[]'::jsonb),
    -- Released totals come from the ledger: a renewal after a release
    -- starts a new pending amount on the same subscription row.
    'releasedByCourse', coalesce((
      select jsonb_object_agg(course_id, total)
      from (
        select course_id, sum(amount) as total
        from public.course_payout_ledger
        where user_id = auth.uid()
        group by course_id
      ) l
    ), '{}'::jsonb)
  );
$$;
revoke execute on function public.get_my_course_sales() from public, anon;
grant execute on function public.get_my_course_sales() to authenticated;

-- -------------------------------------------------------------------------
-- Payout release also tells the creator in-app (the email is sent by the
-- release-course-payout Edge Function).
-- -------------------------------------------------------------------------

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

  perform public.notify_user(v_course.creator_id, 'payment', 'Course payout released',
    'Your payout of NGN ' || to_char(v_creator_amount, 'FM999,999,999,990.##') || ' for "' || v_course.title || '" has been released.',
    'my_courses', v_course.id);

  return v_sub;
end;
$$;
grant execute on function public.release_course_payout(uuid) to authenticated;

-- -------------------------------------------------------------------------
-- Expiry notices. Claims (marks) the rows before returning them so two
-- overlapping runs can't email the same person twice; a failed email is
-- logged by the caller rather than retried, which is the right trade for a
-- once-a-day reminder.
-- -------------------------------------------------------------------------

create or replace function public.claim_course_expiry_notices()
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  r record;
  v_reminders jsonb := '[]'::jsonb;
  v_expired jsonb := '[]'::jsonb;
begin
  for r in
    update public.subscriptions s set expiry_reminder_sent_at = now()
    where s.status = 'active'
      and s.expiry_reminder_sent_at is null
      and s.expires_at > now()
      and s.expires_at <= now() + make_interval(days => public.course_renewal_window_days())
    returning s.id, s.user_id, s.course_id, s.expires_at
  loop
    v_reminders := v_reminders || jsonb_build_object(
      'subscriptionId', r.id, 'userId', r.user_id, 'courseId', r.course_id, 'expiresAt', r.expires_at);
    perform public.notify_user(r.user_id, 'course', 'Course access ending soon',
      'Your access to "' || (select title from public.courses where id = r.course_id) || '" ends on '
        || to_char(r.expires_at at time zone 'Africa/Lagos', 'FMDD Mon YYYY') || '. Renew to keep learning.',
      'course', r.course_id);
  end loop;

  for r in
    update public.subscriptions s
      set expired_notice_sent_at = now(),
          expiry_reminder_sent_at = coalesce(s.expiry_reminder_sent_at, now())
    where s.status = 'active'
      and s.expired_notice_sent_at is null
      and s.expires_at <= now()
    returning s.id, s.user_id, s.course_id, s.expires_at
  loop
    v_expired := v_expired || jsonb_build_object(
      'subscriptionId', r.id, 'userId', r.user_id, 'courseId', r.course_id, 'expiresAt', r.expires_at);
    perform public.notify_user(r.user_id, 'course', 'Course access ended',
      'Your 30-day access to "' || (select title from public.courses where id = r.course_id) || '" has ended. Renew any time to continue.',
      'course', r.course_id);
  end loop;

  return jsonb_build_object('reminders', v_reminders, 'expired', v_expired);
end; $$;
revoke execute on function public.claim_course_expiry_notices() from public, anon, authenticated;

create extension if not exists pg_cron;

create or replace function public.run_course_expiry_notices()
returns void
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_url text;
  v_secret text;
begin
  select decrypted_secret into v_url from vault.decrypted_secrets where name = 'course_expiry_function_url';
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'course_cron_secret';
  if v_url is null or v_secret is null then return; end if;

  perform net.http_post(
    url := v_url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', v_secret),
    body := '{}'::jsonb
  );
end; $$;
revoke execute on function public.run_course_expiry_notices() from public, anon, authenticated;

-- 08:00 in Lagos.
select cron.schedule('course-expiry-notices', '0 7 * * *', 'select public.run_course_expiry_notices()');
