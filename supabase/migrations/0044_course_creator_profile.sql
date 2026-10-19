-- Community courses (source = 'buyer') have no tutors row -- the person
-- who made the course is its teacher. Buyers couldn't see who that was:
-- the course query joins profiles!creator_id, but profiles RLS
-- (can_view_profile) hides other users' rows, so the creator came back
-- empty and the page fell back to "the course creator".
--
-- This exposes a small public card for the creator of a *published*
-- course -- name, photo, short bio, farm name/location and whether they're
-- a verified farmer -- through a computed field, never the profiles row
-- itself (email, phone, address and bank details stay private).

alter table public.profiles
  add column if not exists bio text
    constraint profiles_bio_length check (bio is null or char_length(bio) <= 600);

-- PostgREST computed field: select it as `course_creator_profile` on
-- courses. Security definer so it can read profiles/farmers past RLS;
-- returns only the fields below, and only for published courses (plus the
-- creator and admins, who see their pending ones).
create or replace function public.course_creator_profile(c public.courses)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_profile public.profiles%rowtype;
  v_farmer public.farmers%rowtype;
  v_published int;
begin
  if c.source <> 'buyer' or c.creator_id is null then return null; end if;
  if not (c.is_published or c.creator_id = auth.uid() or public.is_admin()) then return null; end if;

  select * into v_profile from public.profiles where id = c.creator_id;
  if not found or v_profile.status = 'deactivated' then return null; end if;

  select * into v_farmer from public.farmers where user_id = c.creator_id;

  select count(*) into v_published from public.courses
  where creator_id = c.creator_id and source = 'buyer' and is_published;

  return jsonb_build_object(
    'id', v_profile.id,
    'name', v_profile.name,
    'photo', v_profile.profile_image,
    'bio', v_profile.bio,
    'role', v_profile.role,
    'verifiedFarmer', coalesce(v_farmer.status = 'approved', false),
    'farmName', case when v_farmer.status = 'approved' then v_farmer.farm_name end,
    'location', coalesce(case when v_farmer.status = 'approved' then v_farmer.location end, v_profile.state),
    'coursesPublished', v_published,
    'memberSince', v_profile.created_at
  );
end; $$;

revoke execute on function public.course_creator_profile(public.courses) from public;
grant execute on function public.course_creator_profile(public.courses) to anon, authenticated;
