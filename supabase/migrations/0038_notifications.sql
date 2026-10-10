-- =========================================================================
-- Real, stored in-app notifications.
--
-- Until now "notifications" were guessed client-side from recently updated
-- orders/chats, so a buyer whose transport fare was added only learned
-- about it by email: nothing in the app told them to pay, and nothing was
-- marked unread. Notifications are now rows created by triggers on the
-- tables where things actually happen -- whichever path changed them (web,
-- mobile, admin, payment webhook) -- and both apps read them live via
-- Realtime.
--
-- link_type + link_id tell each app where a tap should go, without baking
-- either app's routes into the database:
--   buyer_order / farmer_order -> order id
--   chat                       -> chat id
--   course                     -> course id
--   my_courses                 -> creator's courses list
--   farmer_status              -> farmer verification status
--   refunds                    -> buyer refunds list
-- =========================================================================

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('order', 'payment', 'message', 'course', 'farmer', 'refund')),
  title text not null,
  body text,
  link_type text,
  link_id uuid,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_user_created_idx on public.notifications (user_id, created_at desc);
create index notifications_user_unread_idx on public.notifications (user_id) where read_at is null;

alter table public.notifications enable row level security;

create policy notifications_select on public.notifications
  for select using (user_id = auth.uid());
create policy notifications_update on public.notifications
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy notifications_delete on public.notifications
  for delete using (user_id = auth.uid());
-- No insert policy: rows are only created by the security-definer
-- triggers below.

-- Clients may only mark their own notifications read -- not rewrite them.
revoke update on public.notifications from anon, authenticated;
grant update (read_at) on public.notifications to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;

-- -------------------------------------------------------------------------
-- Helpers
-- -------------------------------------------------------------------------

create or replace function public.notify_user(
  p_user_id uuid, p_type text, p_title text, p_body text, p_link_type text, p_link_id uuid
) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_user_id is null then return; end if;
  insert into public.notifications (user_id, type, title, body, link_type, link_id)
  values (p_user_id, p_type, p_title, p_body, p_link_type, p_link_id);
end; $$;

revoke execute on function public.notify_user(uuid, text, text, text, text, uuid) from public, anon, authenticated;

create or replace function public.notif_order_ref(o public.orders) returns text
language sql immutable as $$
  select coalesce(o.master_order_id, 'KF-' || upper(right(o.id::text, 6)));
$$;

create or replace function public.notif_money(v numeric) returns text
language sql immutable as $$
  select 'NGN ' || to_char(coalesce(v, 0), 'FM999,999,999,990');
$$;

-- -------------------------------------------------------------------------
-- Orders
-- -------------------------------------------------------------------------

create or replace function public.notify_order_change()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_ref text := public.notif_order_ref(new);
  v_farmer_user uuid;
begin
  select user_id into v_farmer_user from public.farmers where id = new.farmer_id;

  if tg_op = 'INSERT' then
    if new.status = 'awaiting_transport_quote' then
      perform public.notify_user(new.buyer_id, 'order', 'Order received',
        'Order ' || v_ref || ': we''re working out your transport fare. You''ll be notified here as soon as it''s ready to pay.',
        'buyer_order', new.id);
    end if;
    return new;
  end if;

  -- Transport fare re-quoted while still waiting for payment.
  if new.status = 'awaiting_payment' and old.status = 'awaiting_payment'
     and new.delivery_fee is distinct from old.delivery_fee then
    perform public.notify_user(new.buyer_id, 'payment', 'Transport fare updated - pay now',
      'Order ' || v_ref || ': transport ' || public.notif_money(new.delivery_fee) || '. New total ' || public.notif_money(new.total) || '.',
      'buyer_order', new.id);
    return new;
  end if;

  if new.status is not distinct from old.status then
    return new;
  end if;

  case new.status
    when 'awaiting_payment' then
      perform public.notify_user(new.buyer_id, 'payment', 'Transport fare ready - pay now',
        'Order ' || v_ref || ': transport ' || public.notif_money(new.delivery_fee) || '. Total to pay ' || public.notif_money(new.total) || '.',
        'buyer_order', new.id);
    when 'pending' then
      perform public.notify_user(new.buyer_id, 'payment', 'Payment received',
        'Order ' || v_ref || ' is paid. The farmer has been asked to accept it.', 'buyer_order', new.id);
      perform public.notify_user(v_farmer_user, 'order', 'New paid order',
        'Order ' || v_ref || ' (' || public.notif_money(new.subtotal) || ') is paid. Accept or reject it.', 'farmer_order', new.id);
    when 'accepted_by_farmer', 'confirmed' then
      perform public.notify_user(new.buyer_id, 'order', 'Farmer accepted your order',
        'Order ' || v_ref || ' is being prepared.', 'buyer_order', new.id);
    when 'packed' then
      perform public.notify_user(new.buyer_id, 'order', 'Order packed',
        'Order ' || v_ref || ' is packed and waiting for a driver.', 'buyer_order', new.id);
    when 'assigned' then
      perform public.notify_user(new.buyer_id, 'order', 'Driver assigned',
        'A driver has been assigned to order ' || v_ref || '.', 'buyer_order', new.id);
      perform public.notify_user(v_farmer_user, 'order', 'Driver assigned',
        'A driver is coming to collect order ' || v_ref || '.', 'farmer_order', new.id);
    when 'in_transit' then
      perform public.notify_user(new.buyer_id, 'order', 'Order on the way',
        'Order ' || v_ref || ' is on its way to you.', 'buyer_order', new.id);
    when 'delivered' then
      perform public.notify_user(new.buyer_id, 'order', 'Order delivered - confirm receipt',
        'Order ' || v_ref || ' was delivered. Please confirm you received it.', 'buyer_order', new.id);
    when 'receipt_confirmed', 'completed' then
      perform public.notify_user(v_farmer_user, 'order', 'Buyer confirmed receipt',
        'Order ' || v_ref || ' is complete.', 'farmer_order', new.id);
    when 'rejected' then
      perform public.notify_user(new.buyer_id, 'order', 'Order not accepted',
        'The farmer couldn''t fulfil order ' || v_ref || '.' ||
        case when new.payment_status in ('paid', 'refunded') then ' Your payment will be refunded.' else '' end,
        'buyer_order', new.id);
    when 'cancelled' then
      perform public.notify_user(new.buyer_id, 'order', 'Order cancelled',
        'Order ' || v_ref || ' was cancelled.', 'buyer_order', new.id);
      if old.status not in ('awaiting_transport_quote', 'awaiting_payment') then
        perform public.notify_user(v_farmer_user, 'order', 'Order cancelled',
          'Order ' || v_ref || ' was cancelled.', 'farmer_order', new.id);
      end if;
    else
      null;
  end case;

  return new;
end; $$;

create trigger orders_notify_insert
  after insert on public.orders
  for each row execute function public.notify_order_change();

create trigger orders_notify_update
  after update of status, delivery_fee on public.orders
  for each row execute function public.notify_order_change();

-- -------------------------------------------------------------------------
-- Chat messages: one notification per chat while unread -- a burst of
-- messages updates it instead of flooding the list.
-- -------------------------------------------------------------------------

create or replace function public.notify_new_message()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_sender text;
  v_preview text;
  v_existing uuid;
begin
  select coalesce(nullif(name, ''), 'Someone') into v_sender from public.profiles where id = new.sender_id;
  v_preview := case
    when new.message_type = 'image' then 'Sent a photo'
    when new.message_type = 'file' then 'Sent a file'
    else left(new.content, 140)
  end;

  select id into v_existing from public.notifications
    where user_id = new.receiver_id and link_type = 'chat' and link_id = new.chat_id and read_at is null
    limit 1;

  if v_existing is not null then
    update public.notifications
      set title = 'New message from ' || v_sender, body = v_preview, created_at = now()
      where id = v_existing;
  else
    perform public.notify_user(new.receiver_id, 'message', 'New message from ' || v_sender, v_preview, 'chat', new.chat_id);
  end if;
  return new;
end; $$;

create trigger messages_notify_insert
  after insert on public.messages
  for each row execute function public.notify_new_message();

-- Opening a chat marks its messages read; clear the matching notification
-- too, so the bell count stays honest.
create or replace function public.clear_chat_notification()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.is_read and not coalesce(old.is_read, false) then
    update public.notifications set read_at = now()
      where user_id = new.receiver_id and link_type = 'chat' and link_id = new.chat_id and read_at is null;
  end if;
  return new;
end; $$;

create trigger messages_clear_notification
  after update of is_read on public.messages
  for each row execute function public.clear_chat_notification();

-- -------------------------------------------------------------------------
-- Courses: purchase, sale, review outcome
-- -------------------------------------------------------------------------

create or replace function public.notify_subscription()
returns trigger
language plpgsql security definer set search_path = public as $$
declare v_course public.courses%rowtype;
begin
  if new.status <> 'active' then return new; end if;
  if tg_op = 'UPDATE' and old.status = 'active' and old.payment_reference = new.payment_reference then return new; end if;
  select * into v_course from public.courses where id = new.course_id;
  perform public.notify_user(new.user_id, 'course', 'Course unlocked',
    'You now have access to "' || coalesce(v_course.title, 'your course') || '".', 'course', new.course_id);
  if v_course.source = 'buyer' and v_course.creator_id is not null then
    perform public.notify_user(v_course.creator_id, 'course', 'New course sale',
      'Someone bought "' || v_course.title || '". Your payout is pending admin release.', 'my_courses', new.course_id);
  end if;
  return new;
end; $$;

create trigger subscriptions_notify
  after insert or update of status, payment_reference on public.subscriptions
  for each row execute function public.notify_subscription();

create or replace function public.notify_course_review()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.source <> 'buyer' or new.creator_id is null or new.status is not distinct from old.status then
    return new;
  end if;
  if new.status = 'approved' then
    perform public.notify_user(new.creator_id, 'course', 'Course approved',
      '"' || new.title || '" is approved and live.', 'my_courses', new.id);
  elsif new.status = 'rejected' then
    perform public.notify_user(new.creator_id, 'course', 'Course needs changes',
      '"' || new.title || '" was not approved' || coalesce(': ' || new.rejection_reason, '.'), 'my_courses', new.id);
  end if;
  return new;
end; $$;

create trigger courses_notify_review
  after update of status on public.courses
  for each row execute function public.notify_course_review();

-- -------------------------------------------------------------------------
-- Farmer verification outcome
-- -------------------------------------------------------------------------

create or replace function public.notify_farmer_status()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status is not distinct from old.status then return new; end if;
  if new.status = 'approved' then
    perform public.notify_user(new.user_id, 'farmer', 'You''re approved as a farmer',
      'Your farm is verified. You can now list products and receive orders.', 'farmer_status', new.id);
  elsif new.status = 'rejected' then
    perform public.notify_user(new.user_id, 'farmer', 'Verification needs attention',
      coalesce('Reason: ' || new.rejection_reason, 'Please review and resubmit your verification.'), 'farmer_status', new.id);
  end if;
  return new;
end; $$;

create trigger farmers_notify_status
  after update of status on public.farmers
  for each row execute function public.notify_farmer_status();

-- -------------------------------------------------------------------------
-- Refunds
-- -------------------------------------------------------------------------

create or replace function public.notify_refund()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform public.notify_user(new.user_id, 'refund', 'Refund issued',
    public.notif_money(new.amount) || ' was refunded' || coalesce(': ' || new.reason, '.'), 'refunds', new.order_id);
  return new;
end; $$;

create trigger refund_ledger_notify
  after insert on public.refund_ledger
  for each row execute function public.notify_refund();

-- -------------------------------------------------------------------------
-- Backfill: orders already waiting for payment get their "pay now"
-- notification, so buyers stuck today see it immediately.
-- -------------------------------------------------------------------------

insert into public.notifications (user_id, type, title, body, link_type, link_id, created_at)
select o.buyer_id, 'payment', 'Transport fare ready - pay now',
  'Order ' || public.notif_order_ref(o) || ': transport ' || public.notif_money(o.delivery_fee) || '. Total to pay ' || public.notif_money(o.total) || '.',
  'buyer_order', o.id, o.updated_at
from public.orders o
where o.status = 'awaiting_payment';
