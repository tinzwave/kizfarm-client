-- Three High-severity audit fixes bundled together (none touch the same
-- objects, but all are small and reviewed together).

-- =========================================================================
-- 1. Chat message tampering: messages_update_read_receipt (0002) scopes the
-- UPDATE by row (receiver_id = auth.uid()) with no column restriction, so a
-- client bypassing the app UI could rewrite content/sender_id/attachment_url
-- on any message addressed to them, not just the three read-receipt fields
-- the app itself ever touches. Same trigger-pins-protected-columns pattern
-- already used for profiles (0001) and farmers (0002).
-- =========================================================================

create or replace function public.protect_message_content_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() <> 'service_role' and not public.is_admin() and auth.uid() <> new.sender_id then
    new.chat_id := old.chat_id;
    new.sender_id := old.sender_id;
    new.receiver_id := old.receiver_id;
    new.content := old.content;
    new.message_type := old.message_type;
    new.attachment_url := old.attachment_url;
    new.attachment_type := old.attachment_type;
    new.created_at := old.created_at;
  end if;
  return new;
end;
$$;

create trigger messages_protect_content_columns
  before update on public.messages
  for each row execute function public.protect_message_content_columns();

-- =========================================================================
-- 2. Product reviews had no purchase gate (reviews_write only checked
-- buyer_id = auth.uid()) -- anyone, including the farmer who owns the
-- product, could post a review with no order ever having happened. Mirrors
-- course_reviews_insert_subscribed (0018), which already requires an
-- active subscription; product reviews never got the equivalent check.
-- USING is untouched (a buyer can still see/edit/delete their own review),
-- only WITH CHECK (insert + update-new-values) gets the purchase
-- requirement, since it must hold every time the row is written, not just
-- once at creation.
-- =========================================================================

drop policy reviews_write on public.reviews;
create policy reviews_write on public.reviews
  for all using (buyer_id = auth.uid() or public.is_admin())
  with check (
    buyer_id = auth.uid()
    and exists (
      select 1 from public.order_items oi
      join public.orders o on o.id = oi.order_id
      where oi.product_id = reviews.product_id
        and o.buyer_id = auth.uid()
        and o.payment_status = 'paid'
    )
  );
