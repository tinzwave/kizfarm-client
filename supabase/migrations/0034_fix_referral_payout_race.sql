-- admin_release_referral_rewards summed pending rewards with a plain
-- (unlocked) select before marking them released. Two concurrent releases
-- for the same referrer (a double-click, or two admins) could both read the
-- same pending total before either UPDATE committed, crediting
-- profiles.account_balance twice for the same rewards. `for update` can't
-- be combined with an aggregate directly, so this locks the candidate rows
-- first (blocking a concurrent call until the first one commits), then
-- re-sums against the now-current, post-lock state.
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

  perform 1 from public.referral_rewards
    where referrer_id = p_referrer_id and status = 'pending'
    for update;

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
