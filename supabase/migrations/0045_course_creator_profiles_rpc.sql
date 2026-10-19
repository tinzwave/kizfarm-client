-- 0044 exposed the creator card as a PostgREST computed field taking a
-- public.courses row. That can't work here: since 0033 courses has only
-- column-level SELECT grants (content and creator_whatsapp are withheld),
-- and building a whole-row argument needs SELECT on every column -- so any
-- query selecting the field failed with "permission denied for table
-- courses". Replaced with an RPC keyed by course id, which the apps call
-- after loading a list of courses.

drop function if exists public.course_creator_profile(public.courses);

-- Returns { "<course id>": { name, photo, bio, ... } } for the given
-- community courses. Same visibility as before: published courses for
-- everyone, plus the creator's own and every course for admins. Only the
-- public fields below are ever returned -- never email, phone, address or
-- bank details.
create or replace function public.get_course_creator_profiles(p_course_ids uuid[])
returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_object_agg(c.id, jsonb_build_object(
    'id', p.id,
    'name', p.name,
    'photo', p.profile_image,
    'bio', p.bio,
    'role', p.role,
    'verifiedFarmer', coalesce(f.status = 'approved', false),
    'farmName', case when f.status = 'approved' then f.farm_name end,
    'location', coalesce(case when f.status = 'approved' then f.location end, p.state),
    'coursesPublished', (
      select count(*) from public.courses c2
      where c2.creator_id = c.creator_id and c2.source = 'buyer' and c2.is_published
    ),
    'memberSince', p.created_at
  )), '{}'::jsonb)
  from public.courses c
  join public.profiles p on p.id = c.creator_id and p.status <> 'deactivated'
  left join public.farmers f on f.user_id = c.creator_id
  where c.id = any(p_course_ids[1:200])
    and c.source = 'buyer'
    and (c.is_published or c.creator_id = auth.uid() or public.is_admin());
$$;

revoke execute on function public.get_course_creator_profiles(uuid[]) from public;
grant execute on function public.get_course_creator_profiles(uuid[]) to anon, authenticated;
