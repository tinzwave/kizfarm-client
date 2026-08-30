-- KIZ FARM: Storage buckets (replacing Cloudinary for all *new* uploads).
-- Existing Cloudinary URLs on migrated records are left as-is per user decision.

insert into storage.buckets (id, name, public) values
  ('farmer-kyc', 'farmer-kyc', false),        -- BVN/gov ID/selfie/farm photos — sensitive
  ('product-images', 'product-images', true), -- marketplace listing photos
  ('driver-images', 'driver-images', true),   -- vehicle photos, admin-managed
  ('tutor-images', 'tutor-images', true),     -- learning hub tutor photos
  ('blog-covers', 'blog-covers', true),       -- blog cover images
  ('chat-attachments', 'chat-attachments', false) -- buyer/farmer chat images/files
on conflict (id) do nothing;

-- Path convention for every bucket below: "<bucket>/<owning-id>/<filename>",
-- so (storage.foldername(name))[1] is the owning farmer/chat/user id.

-- farmer-kyc: owner (by user id) or admin only, both read and write.
create policy farmer_kyc_owner_rw on storage.objects
  for all
  using (bucket_id = 'farmer-kyc' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()))
  with check (bucket_id = 'farmer-kyc' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));

-- product-images: public read; write restricted to the owning farmer or admin.
create policy product_images_select on storage.objects
  for select using (bucket_id = 'product-images');

create policy product_images_write on storage.objects
  for insert with check (
    bucket_id = 'product-images'
    and (
      exists (select 1 from public.farmers f where f.id::text = (storage.foldername(name))[1] and f.user_id = auth.uid())
      or public.is_admin()
    )
  );

create policy product_images_update on storage.objects
  for update using (
    bucket_id = 'product-images'
    and (
      exists (select 1 from public.farmers f where f.id::text = (storage.foldername(name))[1] and f.user_id = auth.uid())
      or public.is_admin()
    )
  );

create policy product_images_delete on storage.objects
  for delete using (
    bucket_id = 'product-images'
    and (
      exists (select 1 from public.farmers f where f.id::text = (storage.foldername(name))[1] and f.user_id = auth.uid())
      or public.is_admin()
    )
  );

-- driver-images, tutor-images, blog-covers: public read, admin-only write.
create policy driver_images_select on storage.objects for select using (bucket_id = 'driver-images');
create policy driver_images_write on storage.objects for insert with check (bucket_id = 'driver-images' and public.is_admin());
create policy driver_images_update on storage.objects for update using (bucket_id = 'driver-images' and public.is_admin());
create policy driver_images_delete on storage.objects for delete using (bucket_id = 'driver-images' and public.is_admin());

create policy tutor_images_select on storage.objects for select using (bucket_id = 'tutor-images');
create policy tutor_images_write on storage.objects for insert with check (bucket_id = 'tutor-images' and public.is_admin());
create policy tutor_images_update on storage.objects for update using (bucket_id = 'tutor-images' and public.is_admin());
create policy tutor_images_delete on storage.objects for delete using (bucket_id = 'tutor-images' and public.is_admin());

create policy blog_covers_select on storage.objects for select using (bucket_id = 'blog-covers');
create policy blog_covers_write on storage.objects for insert with check (bucket_id = 'blog-covers' and public.is_admin());
create policy blog_covers_update on storage.objects for update using (bucket_id = 'blog-covers' and public.is_admin());
create policy blog_covers_delete on storage.objects for delete using (bucket_id = 'blog-covers' and public.is_admin());

-- chat-attachments: only the two chat participants, both read and write.
create policy chat_attachments_rw on storage.objects
  for all
  using (
    bucket_id = 'chat-attachments'
    and exists (
      select 1 from public.chats c
      where c.id::text = (storage.foldername(name))[1]
        and (c.buyer_id = auth.uid() or c.farmer_id = auth.uid())
    )
  )
  with check (
    bucket_id = 'chat-attachments'
    and exists (
      select 1 from public.chats c
      where c.id::text = (storage.foldername(name))[1]
        and (c.buyer_id = auth.uid() or c.farmer_id = auth.uid())
    )
  );
