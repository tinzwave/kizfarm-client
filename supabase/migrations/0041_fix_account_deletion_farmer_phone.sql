-- 0040's anonymisation blanked farmers.phone to '', which violates
-- farmers_phone_numeric (digits only, non-empty) -- deleting any farmer
-- with order history failed. Store a placeholder '0' instead.

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
