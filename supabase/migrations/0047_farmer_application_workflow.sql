-- =========================================================================
-- Farmer application workflow + admin activity log.
--
-- Until now an application was a farmers row whose status moved
-- draft -> pending -> approved/rejected with nothing recorded about who
-- did what, and:
--   * submit_farmer_verification only checked the 5 farm images, so an
--     application could reach the admin queue without an ID or photo;
--   * nothing saved progress -- an applicant who left halfway lost every
--     upload, and "draft" applicants were invisible to admins;
--   * admin_review_farmer would happily review a draft, or re-review an
--     application another admin had just decided, silently overwriting it;
--   * there was no way for an admin to tell an applicant what was missing.
--
-- This migration:
--   1. records submitted_at / reviewed_at / reviewed_by(_name) on farmers;
--   2. adds farmer_application_missing(): the single definition of a
--      complete application (mirrored in lib/kizfarm/farmer-application.ts
--      for display -- keep the two in step);
--   3. adds save_farmer_application_progress() and makes
--      submit_farmer_verification() refuse incomplete applications;
--   4. makes admin_review_farmer() only act on pending applications and
--      require a rejection reason;
--   5. adds farmer_application_messages (admin <-> applicant feedback);
--   6. adds admin_activity_log, written by these RPCs, by a trigger on
--      admin account-status changes and course reviews, and by the
--      delete-account Edge Function.
--
-- RPC signatures used by the mobile app (submit_farmer_verification,
-- admin_review_farmer) are unchanged.
-- =========================================================================

-- -------------------------------------------------------------------------
-- 1. Review bookkeeping on farmers
-- -------------------------------------------------------------------------

-- reviewed_by deliberately has no FK to profiles: a second farmers->profiles
-- relationship would make every existing `profiles(...)` embed on farmers
-- ambiguous in PostgREST. reviewed_by_name keeps the reviewer readable even
-- after that admin account is gone.
alter table public.farmers
  add column if not exists submitted_at timestamptz,
  add column if not exists reviewed_at timestamptz,
  add column if not exists reviewed_by uuid,
  add column if not exists reviewed_by_name text;

update public.farmers
  set submitted_at = created_at
  where submitted_at is null and status in ('pending', 'approved', 'rejected');

create index if not exists farmers_status_created_idx on public.farmers (status, created_at desc);

-- Applicants may edit their own row (farmers_update policy) -- pin the new
-- review columns alongside the existing privileged ones.
create or replace function public.protect_farmer_privileged_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(current_setting('app.bypass_farmer_guard', true), '') <> 'on'
     and auth.role() <> 'service_role'
     and not public.is_admin()
  then
    new.status := old.status;
    new.rejection_reason := old.rejection_reason;
    new.account_balance := old.account_balance;
    new.submitted_at := old.submitted_at;
    new.reviewed_at := old.reviewed_at;
    new.reviewed_by := old.reviewed_by;
    new.reviewed_by_name := old.reviewed_by_name;
  end if;
  return new;
end;
$$;

-- -------------------------------------------------------------------------
-- 2. What a complete application is
-- -------------------------------------------------------------------------

create or replace function public.farmer_application_missing(f public.farmers)
returns text[]
language sql
stable
as $$
  select array_remove(array[
    case when nullif(btrim(coalesce(f.farm_name, '')), '') is null then 'farm_name' end,
    case when nullif(btrim(coalesce(f.phone, '')), '') is null then 'phone' end,
    case when nullif(btrim(coalesce(f.location, '')), '') is null then 'location' end,
    case when nullif(btrim(coalesce(f.farm_type, '')), '') is null then 'farm_type' end,
    case when nullif(btrim(coalesce(f.farm_address, '')), '') is null then 'farm_address' end,
    case when nullif(coalesce(f.farmer_image_url, f.selfie_url, ''), '') is null then 'farmer_image' end,
    case when nullif(coalesce(f.valid_id_image_url, f.gov_id_url, ''), '') is null then 'valid_id_image' end,
    case when (
      select count(*) from unnest(coalesce(f.farm_image_urls, '{}'::text[])) as u(path)
      where nullif(u.path, '') is not null
    ) < 5 then 'farm_images' end
  ], null);
$$;

create or replace function public.farmer_application_missing_label(p_key text)
returns text
language sql
immutable
as $$
  select case p_key
    when 'farm_name' then 'farm name'
    when 'phone' then 'phone number'
    when 'location' then 'farm state'
    when 'farm_type' then 'farm type'
    when 'farm_address' then 'farm address'
    when 'farmer_image' then 'your photo'
    when 'valid_id_image' then 'valid ID'
    when 'farm_images' then '5 farm photos'
    else p_key
  end;
$$;

-- -------------------------------------------------------------------------
-- 3. Applicant: save progress / submit
-- -------------------------------------------------------------------------

-- Shared by save + submit. Internal: not callable by clients directly.
create or replace function public.apply_farmer_application_fields(
  p_farm_name text,
  p_phone text,
  p_location text,
  p_farm_type text,
  p_bvn text,
  p_nin text,
  p_farm_address text,
  p_bvn_url text,
  p_gov_id_url text,
  p_selfie_url text,
  p_farmer_image_url text,
  p_valid_id_image_url text,
  p_farm_image_url text,
  p_farm_image_urls text[]
)
returns public.farmers
language plpgsql
security definer
set search_path = public
as $$
declare
  v_farmer public.farmers%rowtype;
  v_phone text := nullif(btrim(coalesce(p_phone, '')), '');
begin
  select * into v_farmer from public.farmers where user_id = auth.uid() for update;
  if not found then
    raise exception 'Farmer application not found. Start again from "Become a Farmer".' using errcode = 'P0001';
  end if;
  if v_farmer.status = 'approved' then
    raise exception 'Your farm is already verified.' using errcode = 'P0001';
  end if;
  if v_farmer.status = 'pending' then
    raise exception 'Your application is under review and can''t be changed until an admin has decided.' using errcode = 'P0001';
  end if;
  if v_phone is not null and v_phone !~ '^[0-9]{7,15}$' then
    raise exception 'Phone number must be 7 to 15 digits.' using errcode = 'P0001';
  end if;
  if p_farm_image_urls is not null and coalesce(array_length(p_farm_image_urls, 1), 0) > 5 then
    raise exception 'At most 5 farm photos can be uploaded.' using errcode = 'P0001';
  end if;

  update public.farmers set
    farm_name = coalesce(nullif(btrim(coalesce(p_farm_name, '')), ''), farm_name),
    phone = coalesce(v_phone, phone),
    location = coalesce(nullif(btrim(coalesce(p_location, '')), ''), location),
    farm_type = coalesce(nullif(btrim(coalesce(p_farm_type, '')), ''), farm_type),
    bvn = coalesce(p_bvn, bvn),
    nin = coalesce(p_nin, nin),
    farm_address = coalesce(nullif(btrim(coalesce(p_farm_address, '')), ''), farm_address),
    bvn_url = coalesce(p_bvn_url, bvn_url),
    gov_id_url = coalesce(p_valid_id_image_url, p_gov_id_url, gov_id_url),
    valid_id_image_url = coalesce(p_valid_id_image_url, valid_id_image_url),
    selfie_url = coalesce(p_farmer_image_url, p_selfie_url, selfie_url),
    farmer_image_url = coalesce(p_farmer_image_url, farmer_image_url),
    farm_image_url = coalesce(p_farm_image_url, farm_image_url),
    farm_image_urls = coalesce(p_farm_image_urls, farm_image_urls)
  where id = v_farmer.id
  returning * into v_farmer;

  return v_farmer;
end;
$$;
revoke execute on function public.apply_farmer_application_fields(text,text,text,text,text,text,text,text,text,text,text,text,text,text[]) from public, anon, authenticated;

create or replace function public.save_farmer_application_progress(
  p_farm_name text default null,
  p_phone text default null,
  p_location text default null,
  p_farm_type text default null,
  p_farm_address text default null,
  p_farmer_image_url text default null,
  p_valid_id_image_url text default null,
  p_farm_image_urls text[] default null
)
returns public.farmers
language plpgsql
security definer
set search_path = public
as $$
begin
  return public.apply_farmer_application_fields(
    p_farm_name, p_phone, p_location, p_farm_type,
    null, null, p_farm_address, null, null, null,
    p_farmer_image_url, p_valid_id_image_url, null, p_farm_image_urls
  );
end;
$$;
grant execute on function public.save_farmer_application_progress(text,text,text,text,text,text,text,text[]) to authenticated;

create or replace function public.submit_farmer_verification(
  p_bvn text default null,
  p_nin text default null,
  p_farm_address text default null,
  p_bvn_url text default null,
  p_gov_id_url text default null,
  p_selfie_url text default null,
  p_farmer_image_url text default null,
  p_valid_id_image_url text default null,
  p_farm_image_url text default null,
  p_farm_image_urls text[] default null
)
returns public.farmers
language plpgsql
security definer
set search_path = public
as $$
declare
  v_farmer public.farmers%rowtype;
  v_missing text[];
begin
  v_farmer := public.apply_farmer_application_fields(
    null, null, null, null,
    p_bvn, p_nin, p_farm_address, p_bvn_url, p_gov_id_url, p_selfie_url,
    p_farmer_image_url, p_valid_id_image_url, p_farm_image_url, p_farm_image_urls
  );

  v_missing := public.farmer_application_missing(v_farmer);
  if coalesce(array_length(v_missing, 1), 0) > 0 then
    raise exception 'Your application is not complete. Still missing: %.',
      (select string_agg(public.farmer_application_missing_label(k), ', ') from unnest(v_missing) as k)
      using errcode = 'P0001';
  end if;

  perform set_config('app.bypass_farmer_guard', 'on', true);

  update public.farmers set
    status = 'pending',
    rejection_reason = null,
    submitted_at = now(),
    reviewed_at = null,
    reviewed_by = null,
    reviewed_by_name = null
  where id = v_farmer.id
  returning * into v_farmer;

  return v_farmer;
end;
$$;
grant execute on function public.submit_farmer_verification(text,text,text,text,text,text,text,text,text,text[]) to authenticated;

-- -------------------------------------------------------------------------
-- 6a. Admin activity log (defined before the RPCs that write to it)
-- -------------------------------------------------------------------------

-- actor_id / target_id carry no FKs on purpose: the log must outlive the
-- accounts it mentions (that's the point of it), and the *_name/_label
-- snapshots keep each entry readable after a deletion.
create table if not exists public.admin_activity_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid,
  actor_name text,
  actor_email text,
  action text not null,
  target_type text not null,
  target_id uuid,
  target_label text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists admin_activity_log_created_idx on public.admin_activity_log (created_at desc);
create index if not exists admin_activity_log_target_idx on public.admin_activity_log (target_id, created_at desc);
create index if not exists admin_activity_log_actor_idx on public.admin_activity_log (actor_id, created_at desc);

alter table public.admin_activity_log enable row level security;

drop policy if exists admin_activity_log_select on public.admin_activity_log;
create policy admin_activity_log_select on public.admin_activity_log
  for select using (public.is_admin());
-- No insert/update/delete policies: rows come only from security-definer
-- functions below and the service-role delete-account function, and are
-- never edited -- an audit trail admins could rewrite wouldn't be one.
revoke insert, update, delete on public.admin_activity_log from anon, authenticated;

create or replace function public.log_admin_action(
  p_action text,
  p_target_type text,
  p_target_id uuid,
  p_target_label text,
  p_details jsonb default '{}'::jsonb
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor public.profiles%rowtype;
begin
  select * into v_actor from public.profiles where id = auth.uid();
  insert into public.admin_activity_log (actor_id, actor_name, actor_email, action, target_type, target_id, target_label, details)
  values (auth.uid(), v_actor.name, v_actor.email, p_action, p_target_type, p_target_id, p_target_label, coalesce(p_details, '{}'::jsonb));
end;
$$;
revoke execute on function public.log_admin_action(text, text, uuid, text, jsonb) from public, anon, authenticated;

-- -------------------------------------------------------------------------
-- 4. Admin review
-- -------------------------------------------------------------------------

create or replace function public.admin_review_farmer(p_farmer_id uuid, p_approved boolean, p_rejection_reason text default null)
returns public.farmers
language plpgsql
security definer
set search_path = public
as $$
declare
  v_farmer public.farmers%rowtype;
  v_admin public.profiles%rowtype;
  v_reason text := nullif(btrim(coalesce(p_rejection_reason, '')), '');
begin
  if not public.is_admin() then
    raise exception 'Admin required' using errcode = '42501';
  end if;
  select * into v_admin from public.profiles where id = auth.uid();

  select * into v_farmer from public.farmers where id = p_farmer_id for update;
  if not found then
    raise exception 'Farmer application not found' using errcode = 'P0001';
  end if;

  -- Row lock + status check: if two admins open the same application, the
  -- second decision fails loudly instead of silently overwriting the first.
  if v_farmer.status <> 'pending' then
    raise exception 'This application is not waiting for review (it is %). Refresh the page to see its current state.',
      case v_farmer.status when 'draft' then 'still incomplete' else v_farmer.status end
      using errcode = 'P0001';
  end if;
  if not p_approved and v_reason is null then
    raise exception 'Please give the applicant a reason for the rejection.' using errcode = 'P0001';
  end if;

  update public.farmers set
    status = case when p_approved then 'approved' else 'rejected' end,
    rejection_reason = case when p_approved then null else v_reason end,
    reviewed_at = now(),
    reviewed_by = auth.uid(),
    reviewed_by_name = coalesce(v_admin.name, v_admin.email)
  where id = p_farmer_id
  returning * into v_farmer;

  update public.profiles
    set role = case when p_approved then 'farmer' else 'user' end
    where id = v_farmer.user_id;

  perform public.log_admin_action(
    case when p_approved then 'farmer_approved' else 'farmer_rejected' end,
    'farmer', v_farmer.id, coalesce(v_farmer.farm_name, v_farmer.full_name),
    jsonb_build_object('user_id', v_farmer.user_id, 'reason', v_reason)
  );

  return v_farmer;
end;
$$;
grant execute on function public.admin_review_farmer(uuid, boolean, text) to authenticated;

-- -------------------------------------------------------------------------
-- 5. Admin <-> applicant messages
-- -------------------------------------------------------------------------

-- author_id has no FK for the same PostgREST-ambiguity reason as
-- farmers.reviewed_by (a farmers<->profiles link through this table).
create table if not exists public.farmer_application_messages (
  id uuid primary key default gen_random_uuid(),
  farmer_id uuid not null references public.farmers(id) on delete cascade,
  author_id uuid,
  author_role text not null check (author_role in ('admin', 'farmer')),
  author_name text,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index if not exists farmer_application_messages_farmer_idx
  on public.farmer_application_messages (farmer_id, created_at);

alter table public.farmer_application_messages enable row level security;

drop policy if exists farmer_application_messages_select on public.farmer_application_messages;
create policy farmer_application_messages_select on public.farmer_application_messages
  for select using (
    public.is_admin()
    or exists (select 1 from public.farmers f where f.id = farmer_id and f.user_id = auth.uid())
  );
revoke insert, update, delete on public.farmer_application_messages from anon, authenticated;

create or replace function public.post_farmer_application_message(p_farmer_id uuid, p_body text)
returns public.farmer_application_messages
language plpgsql
security definer
set search_path = public
as $$
declare
  v_farmer public.farmers%rowtype;
  v_author public.profiles%rowtype;
  v_body text := btrim(coalesce(p_body, ''));
  v_is_admin boolean := public.is_admin();
  v_msg public.farmer_application_messages%rowtype;
begin
  if v_body = '' then
    raise exception 'Message can''t be empty.' using errcode = 'P0001';
  end if;
  if char_length(v_body) > 2000 then
    raise exception 'Message is too long (2000 characters max).' using errcode = 'P0001';
  end if;

  select * into v_farmer from public.farmers where id = p_farmer_id;
  if not found then
    raise exception 'Farmer application not found' using errcode = 'P0001';
  end if;
  if not v_is_admin and v_farmer.user_id is distinct from auth.uid() then
    raise exception 'Not allowed' using errcode = '42501';
  end if;

  select * into v_author from public.profiles where id = auth.uid();

  insert into public.farmer_application_messages (farmer_id, author_id, author_role, author_name, body)
  values (
    v_farmer.id, auth.uid(),
    case when v_is_admin then 'admin' else 'farmer' end,
    case when v_is_admin then 'KIZ FARM Admin' else coalesce(v_author.name, v_farmer.full_name) end,
    v_body
  )
  returning * into v_msg;

  if v_is_admin then
    perform public.notify_user(v_farmer.user_id, 'farmer', 'Message about your farmer application',
      left(v_body, 160), 'farmer_status', v_farmer.id);
    perform public.log_admin_action('farmer_message_sent', 'farmer', v_farmer.id,
      coalesce(v_farmer.farm_name, v_farmer.full_name),
      jsonb_build_object('user_id', v_farmer.user_id, 'status', v_farmer.status, 'message', left(v_body, 500)));
  end if;

  return v_msg;
end;
$$;
grant execute on function public.post_farmer_application_message(uuid, text) to authenticated;

-- -------------------------------------------------------------------------
-- 6b. Triggers feeding the activity log
-- -------------------------------------------------------------------------

-- Suspend / unsuspend / deactivate are plain admin UPDATEs on profiles
-- from the browser, so they're captured here rather than in each caller.
-- Service-role changes (delete-account) are logged by that function.
create or replace function public.log_profile_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status is not distinct from old.status then return new; end if;
  if auth.uid() is null or auth.uid() = new.id or not public.is_admin() then return new; end if;
  perform public.log_admin_action(
    case new.status
      when 'suspended' then 'account_suspended'
      when 'deactivated' then 'account_deactivated'
      when 'active' then 'account_reactivated'
      else 'account_status_changed'
    end,
    case when new.role = 'farmer' then 'farmer_account' else 'user' end,
    new.id, coalesce(new.name, new.email),
    jsonb_build_object('from', old.status, 'to', new.status, 'reason', new.suspension_reason, 'email', new.email)
  );
  return new;
end;
$$;

drop trigger if exists profiles_log_status_change on public.profiles;
create trigger profiles_log_status_change
  after update of status on public.profiles
  for each row execute function public.log_profile_status_change();

create or replace function public.log_course_review()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status is not distinct from old.status or not public.is_admin() then return new; end if;
  if new.status not in ('approved', 'rejected') then return new; end if;
  perform public.log_admin_action(
    case when new.status = 'approved' then 'course_approved' else 'course_rejected' end,
    'course', new.id, new.title,
    jsonb_build_object('reason', new.rejection_reason, 'creator_id', new.creator_id)
  );
  return new;
end;
$$;

drop trigger if exists courses_log_review on public.courses;
create trigger courses_log_review
  after update of status on public.courses
  for each row execute function public.log_course_review();

-- -------------------------------------------------------------------------
-- Applicant notifications: also confirm receipt of a submission
-- -------------------------------------------------------------------------

create or replace function public.notify_farmer_status()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status is not distinct from old.status then return new; end if;
  if new.status = 'approved' then
    perform public.notify_user(new.user_id, 'farmer', 'You''re approved as a farmer',
      'Your farm is verified. Open your Farmer Dashboard to list products and receive orders.', 'farmer_status', new.id);
  elsif new.status = 'rejected' then
    perform public.notify_user(new.user_id, 'farmer', 'Your farmer application needs changes',
      coalesce('Reason: ' || new.rejection_reason, 'Please review and resubmit your application.'), 'farmer_status', new.id);
  elsif new.status = 'pending' then
    perform public.notify_user(new.user_id, 'farmer', 'Farmer application received',
      'Thanks! An admin is reviewing your farm details. We''ll notify you as soon as there''s a decision.', 'farmer_status', new.id);
  end if;
  return new;
end; $$;
