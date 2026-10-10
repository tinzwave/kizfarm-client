-- Course cover images, shown on course cards in the web app and the mobile
-- app. Stored as a public URL; uploads go to the new course-covers bucket.
-- (cover_image was already added to the live database by hand -- this makes
-- the migration history match, idempotently.)
--
-- Path convention (same as the other buckets): "<user id>/<filename>", so a
-- course creator can only write into their own folder; admins anywhere.

alter table public.courses add column if not exists cover_image text;

insert into storage.buckets (id, name, public) values ('course-covers', 'course-covers', true)
on conflict (id) do nothing;

create policy course_covers_select on storage.objects
  for select using (bucket_id = 'course-covers');

create policy course_covers_write on storage.objects
  for insert with check (
    bucket_id = 'course-covers'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );

create policy course_covers_update on storage.objects
  for update using (
    bucket_id = 'course-covers'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );

create policy course_covers_delete on storage.objects
  for delete using (
    bucket_id = 'course-covers'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );

-- Existing courses: use the first hosted (http/https) image in the lesson
-- content as the cover. Embedded base64 images are skipped -- far too large
-- to ship in every course-list response; those courses fall back to the
-- apps' placeholder artwork until a cover is uploaded.
update public.courses
set cover_image = substring(content from '<img[^>]+src="(https?://[^"]+)"')
where cover_image is null
  and content ~ '<img[^>]+src="https?://';
