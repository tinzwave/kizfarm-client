-- Course purchases had no webhook-based fallback activation, unlike
-- product orders (which get both the webhook AND the buyer's own
-- verify-and-pay-order call as independent activation paths). If a buyer's
-- tab crashed/lost network right after Paystack confirmed the charge but
-- before the purchase-course Edge Function call completed, the charge went
-- through and activate_subscription never ran -- no automatic recovery.
--
-- Fix lands in two parts: this migration makes activate_subscription safe
-- to call twice for the same successful payment (the webhook is about to
-- become a second caller for the exact same event, not just a rare-crash
-- fallback), and paystack-webhook/index.ts (edge function, not a
-- migration) gains a course branch that reads course_id/user_id back out
-- of the Paystack metadata the checkout page now sends at charge time.
--
-- Without the idempotency guard, activate_subscription's upsert
-- (on conflict ... do update set payout_status = excluded.payout_status,
-- paid_at = now()) would silently reset an already-released payout back to
-- 'pending' and stomp paid_at every time both callers fire for one
-- purchase -- which, once the webhook is wired up, is the common case, not
-- an edge case.

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
