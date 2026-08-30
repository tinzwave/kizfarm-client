-- Chat — port of chat.mjs's message-send flow and the parts of index.mjs's
-- Socket.IO wiring that actually get replaced by Postgres Realtime.
--
-- chats/messages already have full RLS from 0002 (chats_select/chats_insert,
-- messages_select/messages_insert/messages_update_read_receipt). The one
-- gap: chats has no UPDATE policy, because "send a message" is really two
-- writes (insert the message, then update the chat's last_message/
-- last_message_time denormalized fields) that need to happen atomically --
-- same shape as every other multi-table mutation in this schema, so it
-- becomes a SECURITY DEFINER RPC rather than a raw client UPDATE grant.
--
-- Marking a message read stays a direct client UPDATE (messages_update_read_receipt
-- already allows it) -- Realtime's postgres_changes feed on `messages` then
-- pushes that read receipt to the sender automatically, replacing the
-- separate "messages_read" socket broadcast.

create or replace function public.send_chat_message(
  p_chat_id uuid,
  p_content text,
  p_message_type text default 'text',
  p_attachment_url text default null,
  p_attachment_type text default null
)
returns public.messages
language plpgsql
security definer
set search_path = public
as $$
declare
  v_chat public.chats%rowtype;
  v_receiver_id uuid;
  v_message public.messages%rowtype;
  v_last_message text;
begin
  if p_message_type not in ('text', 'image', 'file') then
    raise exception 'Invalid message type' using errcode = 'P0001';
  end if;
  if p_message_type = 'text' and coalesce(trim(p_content), '') = '' then
    raise exception 'Message content required' using errcode = 'P0001';
  end if;

  select * into v_chat from public.chats where id = p_chat_id;
  if not found then
    raise exception 'Chat not found' using errcode = 'P0001';
  end if;
  if auth.uid() <> v_chat.buyer_id and auth.uid() <> v_chat.farmer_id then
    raise exception 'Unauthorized' using errcode = '42501';
  end if;

  v_receiver_id := case when auth.uid() = v_chat.buyer_id then v_chat.farmer_id else v_chat.buyer_id end;

  insert into public.messages (chat_id, sender_id, receiver_id, content, message_type, attachment_url, attachment_type, delivery_status)
  values (
    p_chat_id, auth.uid(), v_receiver_id,
    coalesce(nullif(trim(p_content), ''), case when p_message_type = 'image' then 'Sent an image' else 'Sent a file' end),
    p_message_type, p_attachment_url, p_attachment_type, 'sent'
  )
  returning * into v_message;

  v_last_message := case when p_message_type = 'image' then '📷 Image' when p_message_type = 'file' then '📎 File' else v_message.content end;

  update public.chats set
    last_message = v_last_message,
    last_message_time = v_message.created_at,
    last_message_sender_id = auth.uid(),
    updated_at = now()
  where id = p_chat_id;

  return v_message;
end;
$$;
grant execute on function public.send_chat_message(uuid, text, text, text, text) to authenticated;

-- Enable Realtime on chats/messages so both frontends can subscribe to
-- postgres_changes instead of a Socket.IO server -- idempotent since the
-- project may already have these tables published.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'chats'
  ) then
    alter publication supabase_realtime add table public.chats;
  end if;
end $$;
