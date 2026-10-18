-- Course creators (farmers or buyers) can leave a WhatsApp number for
-- guidance. Subscribers get it for 30 days after paying -- the length of
-- one farming "mission" -- not forever.
--
-- Like courses.content, the number must not be readable straight off the
-- courses table: 0033 revoked table-wide SELECT and re-granted it column by
-- column, so leaving creator_whatsapp out of that grant keeps it private.
-- INSERT/UPDATE are still table-level grants, so creators can set it, and
-- the only read path is the gated RPC below.
alter table public.courses
  add column creator_whatsapp text
    constraint courses_creator_whatsapp_format check (
      creator_whatsapp is null
      or (
        creator_whatsapp ~ '^\+?[0-9][0-9 -]*[0-9]$'
        and length(regexp_replace(creator_whatsapp, '[^0-9]', '', 'g')) between 7 and 15
      )
    );

-- Public, number-free flag so a course page can advertise "includes 30
-- days of WhatsApp guidance" before purchase without exposing the number.
alter table public.courses
  add column has_creator_whatsapp boolean
    generated always as (creator_whatsapp is not null) stored;
grant select (has_creator_whatsapp) on public.courses to anon, authenticated;

create or replace function public.get_course_creator_contact(p_course_id uuid)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_whatsapp text;
  v_creator uuid;
  v_paid_at timestamptz;
  v_until timestamptz;
begin
  select creator_whatsapp, creator_id into v_whatsapp, v_creator
  from public.courses where id = p_course_id;
  if not found then raise exception 'Course not found' using errcode = 'P0001'; end if;

  if public.is_admin() or v_creator = auth.uid() then
    return jsonb_build_object('whatsapp', v_whatsapp, 'accessUntil', null, 'expired', false);
  end if;

  select paid_at into v_paid_at from public.subscriptions
  where course_id = p_course_id and user_id = auth.uid() and status = 'active';
  if not found then raise exception 'Access denied' using errcode = '42501'; end if;

  v_until := v_paid_at + interval '30 days';
  if now() > v_until then
    return jsonb_build_object('whatsapp', null, 'accessUntil', v_until, 'expired', true);
  end if;
  return jsonb_build_object('whatsapp', v_whatsapp, 'accessUntil', v_until, 'expired', false);
end; $$;
grant execute on function public.get_course_creator_contact(uuid) to authenticated;
