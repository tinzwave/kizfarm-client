-- Follow-up fixes from the second audit pass, after the first pass's fixes
-- (0025-0028) had a chance to be independently re-reviewed.

-- =========================================================================
-- 1. Course purchases had no suspension check, unlike product orders
-- (create_split_orders, 0025/0028) -- a suspended/deactivated buyer with a
-- still-valid session could still buy a course by calling the
-- purchase-course Edge Function directly (the frontend AuthGuard would
-- normally sign them out first, but that's only a client-side line of
-- defense). Added after the existing idempotency short-circuit, so a
-- purchase that already completed while the buyer was active doesn't
-- retroactively fail if they're suspended by the time the webhook fallback
-- (or a retry) runs.
-- =========================================================================

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
  select * into v_sub from public.subscriptions where user_id = p_user_id and course_id = p_course_id;
  if found and v_sub.status = 'active' and v_sub.payment_reference = p_payment_reference then
    return v_sub; -- already activated by this exact payment: idempotent no-op for double-fire (client + webhook)
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

-- =========================================================================
-- 2. messages_insert let a client bypass send_chat_message entirely (which
-- has its own active-profile check, added in 0025) by inserting directly
-- into the messages table -- RLS allowed it as long as sender_id/chat_id
-- checked out, with no suspension check of its own. A suspended user could
-- still send messages this way even though the app's own send_chat_message
-- path correctly blocks them.
-- =========================================================================

drop policy messages_insert on public.messages;
create policy messages_insert on public.messages
  for insert with check (
    sender_id = auth.uid()
    and (select status from public.profiles where id = auth.uid()) = 'active'
    and exists (
      select 1 from public.chats c
      where c.id = chat_id and (c.buyer_id = auth.uid() or c.farmer_id = auth.uid())
    )
  );

-- =========================================================================
-- 3. reviews_write (0026) was one FOR ALL policy, so its purchase-gate
-- WITH CHECK re-evaluated on every write, including a buyer editing their
-- OWN already-existing review -- if the underlying order was later
-- cancelled/refunded (for reasons unrelated to the review) after the
-- review was created, the buyer could never edit that review again; RLS
-- would just silently reject the update. course_reviews (0018) already
-- gets this right by splitting insert from update/delete: the purchase
-- gate only needs to hold once, at creation -- owning the row afterward is
-- itself the proof they were once eligible. Split reviews the same way.
-- =========================================================================

drop policy reviews_write on public.reviews;

create policy reviews_insert on public.reviews
  for insert with check (
    buyer_id = auth.uid()
    and exists (
      select 1 from public.order_items oi
      join public.orders o on o.id = oi.order_id
      where oi.product_id = reviews.product_id
        and o.buyer_id = auth.uid()
        and o.payment_status = 'paid'
    )
  );

create policy reviews_update on public.reviews
  for update using (buyer_id = auth.uid() or public.is_admin())
  with check (buyer_id = auth.uid() or public.is_admin());

create policy reviews_delete on public.reviews
  for delete using (buyer_id = auth.uid() or public.is_admin());
