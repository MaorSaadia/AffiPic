-- Requires the Supabase-managed storage schema. Never delete storage objects via SQL.
begin;
insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', false, 2097152, array['image/webp']);

create policy "Read owned product images" on storage.objects for select to authenticated
using (bucket_id = 'product-images' and exists (
  select 1 from public.websites w where w.id::text = split_part(storage.objects.name, '/', 1) and w.account_id = (select auth.uid())
));
create policy "Upload owned product images" on storage.objects for insert to authenticated
with check (bucket_id = 'product-images' and name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.webp$' and exists (
  select 1 from public.websites w where w.id::text = split_part(storage.objects.name, '/', 1) and w.account_id = (select auth.uid())
));
-- No overwrite/update policy: each upload gets a fresh random name.
create policy "Delete unused owned product images" on storage.objects for delete to authenticated
using (bucket_id = 'product-images' and exists (
  select 1 from public.websites w where w.id::text = split_part(storage.objects.name, '/', 1) and w.account_id = (select auth.uid())
) and not exists (select 1 from public.products p where p.image_path = storage.objects.name));
commit;
