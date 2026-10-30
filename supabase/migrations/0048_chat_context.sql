-- =========================================================================
-- Chat context: who you're talking to, and about what.
--
-- The chat screen showed a hard-coded stock photo for everyone, said
-- "Online" unconditionally, and never showed the product a conversation
-- was started from -- although every chat row already belongs to exactly
-- one product (chats.product_id).
--
-- get_chat_context() returns, for one chat the caller takes part in:
--   * both participants' *public* card -- name, photo, role, member since,
--     and for verified farmers their farm name, state, type, live listings,
--     completed sales and review average. Never email, phone, address,
--     KYC or bank details (same rule as get_course_creator_profiles, 0045);
--   * the product the chat is about (name, price, unit, stock, cover, and
--     whether it's still listed);
--   * how many orders the two have placed together.
-- =========================================================================

create or replace function public.chat_party_card(p_user_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'id', p.id,
    'name', case when p.status = 'deactivated' then 'Deleted user' else p.name end,
    'photo', case when p.status = 'deactivated' then null else p.profile_image end,
    'role', p.role,
    'accountStatus', p.status,
    'memberSince', p.created_at,
    'verifiedFarmer', coalesce(f.status = 'approved', false),
    'farmName', case when f.status = 'approved' then f.farm_name end,
    'farmType', case when f.status = 'approved' then f.farm_type end,
    'location', coalesce(case when f.status = 'approved' then f.location end, p.state),
    'activeListings', case when f.status = 'approved' then (
      select count(*) from public.products pr where pr.farmer_id = f.id and pr.is_active
    ) end,
    'completedSales', case when f.status = 'approved' then (
      select count(*) from public.orders o
      where o.farmer_id = f.id and o.status in ('delivered', 'receipt_confirmed', 'completed')
    ) end,
    'rating', case when f.status = 'approved' then (
      select round(avg(r.rating)::numeric, 1) from public.reviews r
      join public.products pr on pr.id = r.product_id
      where pr.farmer_id = f.id
    ) end,
    'reviewCount', case when f.status = 'approved' then (
      select count(*) from public.reviews r
      join public.products pr on pr.id = r.product_id
      where pr.farmer_id = f.id
    ) end
  )
  from public.profiles p
  left join public.farmers f on f.user_id = p.id
  where p.id = p_user_id;
$$;
-- Internal helper: only reachable through get_chat_context's participant
-- check, so it can't be used to look up arbitrary users.
revoke execute on function public.chat_party_card(uuid) from public, anon, authenticated;

create or replace function public.get_chat_context(p_chat_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_chat public.chats%rowtype;
  v_product public.products%rowtype;
  v_farmer_row_id uuid;
begin
  select * into v_chat from public.chats where id = p_chat_id;
  if not found then
    raise exception 'Chat not found' using errcode = 'P0001';
  end if;
  if auth.uid() is distinct from v_chat.buyer_id
     and auth.uid() is distinct from v_chat.farmer_id
     and not public.is_admin() then
    raise exception 'Not allowed' using errcode = '42501';
  end if;

  select * into v_product from public.products where id = v_chat.product_id;
  select id into v_farmer_row_id from public.farmers where user_id = v_chat.farmer_id;

  return jsonb_build_object(
    'chatId', v_chat.id,
    'startedAt', v_chat.created_at,
    'buyer', public.chat_party_card(v_chat.buyer_id),
    'farmer', public.chat_party_card(v_chat.farmer_id),
    'product', case when v_product.id is null then null else jsonb_build_object(
      'id', v_product.id,
      'name', v_product.name,
      'price', v_product.price,
      'unit', v_product.unit,
      'quantity', v_product.quantity,
      'category', v_product.category,
      'image', v_product.images[1],
      'isActive', v_product.is_active
    ) end,
    'ordersTogether', (
      select count(*) from public.orders o
      where o.buyer_id = v_chat.buyer_id and o.farmer_id = v_farmer_row_id
    )
  );
end;
$$;
grant execute on function public.get_chat_context(uuid) to authenticated;
