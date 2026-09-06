-- courses.content (the actual paid lesson body) sat on the same row as
-- public preview metadata (title, price, cover). RLS on courses_select only
-- restricts row visibility (is_published/creator/admin), not columns, and
-- Supabase's default project grants give anon/authenticated full column
-- SELECT on every table -- so any published course's full content was
-- fetchable by anyone, no purchase required, straight off the courses
-- table. Revoking column-level select and routing all content reads
-- through this admin/creator/active-subscriber-gated RPC closes that.
revoke select (content) on public.courses from anon, authenticated;

create or replace function public.get_course_content(p_course_id uuid)
returns text
language plpgsql security definer set search_path = public as $$
declare v_content text; v_creator uuid;
begin
  select content, creator_id into v_content, v_creator from public.courses where id = p_course_id;
  if not found then raise exception 'Course not found' using errcode = 'P0001'; end if;

  if public.is_admin()
    or v_creator = auth.uid()
    or exists (
      select 1 from public.subscriptions
      where course_id = p_course_id and user_id = auth.uid() and status = 'active'
    )
  then
    return v_content;
  end if;

  raise exception 'Access denied' using errcode = '42501';
end; $$;
grant execute on function public.get_course_content(uuid) to authenticated;
