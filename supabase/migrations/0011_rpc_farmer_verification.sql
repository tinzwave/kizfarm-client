-- Farmer verification — port of farmer.mjs POST /verify and
-- admin.mjs /verify-farmers/:id/approve|reject.
--
-- Farmer registration itself (POST /farmer/register) needs no RPC: the
-- farmers_insert RLS policy already allows a farmer to create their own
-- draft row, and the existing unique constraint on farmers.user_id
-- naturally rejects a second registration (Postgres error 23505) --
-- exactly the "Already registered" behavior from the original route,
-- for free. Adding the same phone-format validation as a CHECK constraint
-- rather than app code, for the same reason.

alter table public.farmers add constraint farmers_phone_numeric check (phone ~ '^[0-9]+$');

-- Same trigger-bypass pattern as profiles (see 0010): a farmer submitting
-- their OWN verification needs to flip their OWN status column, which the
-- privileged-column guard would otherwise silently block since the real
-- caller isn't admin/service_role.
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
  end if;
  return new;
end;
$$;

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
  v_gov_id_url text;
  v_selfie_url text;
begin
  select * into v_farmer from public.farmers where user_id = auth.uid() for update;
  if not found then
    raise exception 'Farmer record not found' using errcode = 'P0001';
  end if;

  if p_farm_image_urls is not null and array_length(p_farm_image_urls, 1) <> 5 then
    raise exception 'Exactly 5 farm images are required' using errcode = 'P0001';
  end if;
  if p_farm_image_urls is null and coalesce(array_length(v_farmer.farm_image_urls, 1), 0) <> 5 then
    raise exception 'Exactly 5 farm images are required' using errcode = 'P0001';
  end if;

  -- validIdImage doubles as govId, farmerImage doubles as selfie -- same
  -- field-aliasing behavior the original multipart route had.
  v_gov_id_url := coalesce(p_valid_id_image_url, p_gov_id_url, v_farmer.gov_id_url);
  v_selfie_url := coalesce(p_farmer_image_url, p_selfie_url, v_farmer.selfie_url);

  perform set_config('app.bypass_farmer_guard', 'on', true);

  update public.farmers set
    bvn = coalesce(p_bvn, bvn),
    nin = coalesce(p_nin, nin),
    farm_address = coalesce(p_farm_address, farm_address),
    bvn_url = coalesce(p_bvn_url, bvn_url),
    gov_id_url = v_gov_id_url,
    valid_id_image_url = coalesce(p_valid_id_image_url, valid_id_image_url),
    selfie_url = v_selfie_url,
    farmer_image_url = coalesce(p_farmer_image_url, farmer_image_url),
    farm_image_url = coalesce(p_farm_image_url, farm_image_url),
    farm_image_urls = coalesce(p_farm_image_urls, farm_image_urls),
    status = 'pending',
    rejection_reason = null
  where user_id = auth.uid()
  returning * into v_farmer;

  return v_farmer;
end;
$$;
grant execute on function public.submit_farmer_verification(text,text,text,text,text,text,text,text,text,text[]) to authenticated;

create or replace function public.admin_review_farmer(p_farmer_id uuid, p_approved boolean, p_rejection_reason text default null)
returns public.farmers
language plpgsql
security definer
set search_path = public
as $$
declare
  v_farmer public.farmers%rowtype;
begin
  if not public.is_admin() then
    raise exception 'Admin required' using errcode = '42501';
  end if;

  select * into v_farmer from public.farmers where id = p_farmer_id for update;
  if not found then
    raise exception 'Farmer not found' using errcode = 'P0001';
  end if;

  update public.farmers
    set status = case when p_approved then 'approved' else 'rejected' end,
        rejection_reason = case when p_approved then null else coalesce(p_rejection_reason, 'No reason provided') end
    where id = p_farmer_id
    returning * into v_farmer;

  update public.profiles
    set role = case when p_approved then 'farmer' else 'user' end
    where id = v_farmer.user_id;

  return v_farmer;
end;
$$;
grant execute on function public.admin_review_farmer(uuid, boolean, text) to authenticated;
