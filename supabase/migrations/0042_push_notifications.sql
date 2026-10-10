-- =========================================================================
-- Phone push notifications.
--
-- Every row inserted into public.notifications (and every chat-message
-- burst that refreshes one) is forwarded to the user's registered phones
-- through the send-push Edge Function -> Expo Push Service -> FCM/APNs,
-- so it arrives even when the app is closed.
--
-- The trigger reads two vault secrets, set once outside migrations:
--   push_function_url    https://<project>.supabase.co/functions/v1/send-push
--   push_webhook_secret  shared secret also set as PUSH_WEBHOOK_SECRET on
--                        the send-push function
-- Until they exist the trigger does nothing.
-- =========================================================================

create extension if not exists pg_net with schema extensions;

create table public.push_tokens (
  token text primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  platform text check (platform in ('ios', 'android')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index push_tokens_user_idx on public.push_tokens (user_id);

alter table public.push_tokens enable row level security;
create policy push_tokens_select on public.push_tokens for select using (user_id = auth.uid());
-- Writes go through the functions below.

-- A device token belongs to whoever is signed in on that phone now: if a
-- different account logs in on the same phone, the token moves over so
-- the previous user stops receiving that phone's pushes.
create or replace function public.register_push_token(p_token text, p_platform text)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Not authenticated' using errcode = '42501'; end if;
  if p_token is null or p_token !~ '^Expo(nent)?PushToken\[.+\]$' then
    raise exception 'Invalid push token' using errcode = 'P0001';
  end if;
  insert into public.push_tokens (token, user_id, platform)
  values (p_token, auth.uid(), p_platform)
  on conflict (token) do update set user_id = excluded.user_id, platform = excluded.platform, updated_at = now();
end; $$;

create or replace function public.unregister_push_token(p_token text)
returns void
language sql security definer set search_path = public as $$
  delete from public.push_tokens where token = p_token and user_id = auth.uid();
$$;

revoke execute on function public.register_push_token(text, text) from public, anon;
revoke execute on function public.unregister_push_token(text) from public, anon;
grant execute on function public.register_push_token(text, text) to authenticated;
grant execute on function public.unregister_push_token(text) to authenticated;

create or replace function public.forward_notification_push()
returns trigger
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_url text;
  v_secret text;
begin
  -- Only new notifications / refreshed chat bursts, and only if the user
  -- has a phone registered.
  if tg_op = 'UPDATE' and new.created_at is not distinct from old.created_at then return new; end if;
  if new.read_at is not null then return new; end if;
  if not exists (select 1 from public.push_tokens where user_id = new.user_id) then return new; end if;

  select decrypted_secret into v_url from vault.decrypted_secrets where name = 'push_function_url';
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'push_webhook_secret';
  if v_url is null or v_secret is null then return new; end if;

  perform net.http_post(
    url := v_url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-push-secret', v_secret),
    body := jsonb_build_object('notification_id', new.id)
  );
  return new;
exception when others then
  -- Never let a push problem block the order/chat change that caused it.
  raise warning 'push forward failed: %', sqlerrm;
  return new;
end; $$;

create trigger notifications_forward_push
  after insert or update of created_at on public.notifications
  for each row execute function public.forward_notification_push();

-- Account deletion also forgets the user's phones.
create or replace function public.delete_account_data(p_user_id uuid)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_profile public.profiles%rowtype;
  v_farmer_id uuid;
  v_has_history boolean;
begin
  select * into v_profile from public.profiles where id = p_user_id;
  if not found then
    return jsonb_build_object('hard_delete', true, 'farmer_id', null, 'missing', true);
  end if;
  if v_profile.role = 'admin' then
    raise exception 'Admin accounts cannot be deleted this way.' using errcode = '42501';
  end if;

  select id into v_farmer_id from public.farmers where user_id = p_user_id;

  -- Private, unshared data: always removed.
  delete from public.notifications where user_id = p_user_id;
  delete from public.addresses where user_id = p_user_id;
  delete from public.carts where user_id = p_user_id;
  delete from public.wishlists where buyer_id = p_user_id;
  delete from public.push_tokens where user_id = p_user_id;

  -- Products: delete any never ordered or discussed, hide the rest.
  delete from public.products p
    where p.user_id = p_user_id
      and not exists (select 1 from public.order_items oi where oi.product_id = p.id)
      and not exists (select 1 from public.chats c where c.product_id = p.id);
  update public.products set is_active = false where user_id = p_user_id;

  update public.courses set is_published = false where creator_id = p_user_id;
  update public.profiles set referred_by = null where referred_by = p_user_id;
  delete from public.referrals where referrer_id = p_user_id or referred_id = p_user_id;

  v_has_history :=
       exists (select 1 from public.orders where buyer_id = p_user_id)
    or (v_farmer_id is not null and exists (select 1 from public.orders where farmer_id = v_farmer_id))
    or exists (select 1 from public.escrows where buyer_id = p_user_id or (v_farmer_id is not null and farmer_id = v_farmer_id))
    or exists (select 1 from public.subscriptions where user_id = p_user_id)
    or exists (select 1 from public.chats where buyer_id = p_user_id or farmer_id = p_user_id)
    or exists (select 1 from public.messages where sender_id = p_user_id or receiver_id = p_user_id)
    or exists (select 1 from public.reviews where buyer_id = p_user_id)
    or exists (select 1 from public.course_reviews where buyer_id = p_user_id)
    or exists (select 1 from public.courses where creator_id = p_user_id)
    or exists (select 1 from public.course_payout_ledger where user_id = p_user_id)
    or exists (select 1 from public.products where user_id = p_user_id);

  if not v_has_history then
    delete from public.farmers where user_id = p_user_id;
    return jsonb_build_object('hard_delete', true, 'farmer_id', v_farmer_id);
  end if;

  -- Anonymise what has to stay.
  perform set_config('app.bypass_profile_guard', 'on', true);
  update public.profiles set
    name = 'Deleted user',
    email = 'deleted-' || p_user_id || '@deleted.kizfarm.invalid',
    phone = null, profile_image = null, address = null, city = null, state = null,
    bank_name = null, account_holder_name = null, account_number = null,
    referral_code = null, status = 'deactivated',
    suspension_reason = 'Account deleted', suspended_at = now()
  where id = p_user_id;

  update public.farmers set
    full_name = 'Deleted user', farm_name = 'Deleted farm', phone = '0', -- farmers_phone_numeric: digits only, non-empty
    location = null, farm_type = null, farm_address = null,
    bvn = null, nin = null, bvn_url = null, gov_id_url = null, selfie_url = null,
    farmer_image_url = null, valid_id_image_url = null, farm_image_url = null, farm_image_urls = '{}',
    bank_name = null, account_holder_name = null, account_number = null, branch_code = null,
    bank_verified = false, bank_verified_at = null
  where user_id = p_user_id;

  return jsonb_build_object('hard_delete', false, 'farmer_id', v_farmer_id);
end; $$;

revoke execute on function public.delete_account_data(uuid) from public, anon, authenticated;
