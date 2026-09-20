begin;
alter table public.websites drop constraint websites_status_check;
alter table public.websites add constraint websites_status_check check (status in ('draft','published'));
grant update (status) on public.websites to authenticated;
-- Existing owner-only UPDATE policy still applies; INSERT cannot supply status.
create function public.check_website_publication() returns trigger language plpgsql set search_path = '' as $$
begin
  if new.status = 'published' and old.status <> 'published'
    and not exists (select 1 from public.products p where p.website_id = new.id) then
    raise exception 'Add at least one product before publishing' using errcode = '23514';
  end if;
  return new;
end;
$$;
revoke all on function public.check_website_publication() from public, anon, authenticated;
create trigger website_publication before update on public.websites
for each row execute function public.check_website_publication();

-- Expose only display fields, never account IDs or management fields.
grant select (id,name,slug,description,status) on public.websites to anon;
grant select (id,website_id,name) on public.categories, public.merchants to anon;
grant select (id,website_id,name,description,affiliate_url,category_id,merchant_id,image_path,created_at) on public.products to anon;
create policy "Read published website" on public.websites for select to anon using (status = 'published');
create policy "Read published categories" on public.categories for select to anon
using (exists (select 1 from public.websites w where w.id = categories.website_id and w.status = 'published'));
create policy "Read published merchants" on public.merchants for select to anon
using (exists (select 1 from public.websites w where w.id = merchants.website_id and w.status = 'published'));
create policy "Read published products" on public.products for select to anon
using (exists (select 1 from public.websites w where w.id = products.website_id and w.status = 'published'));

-- Keep the bucket private. Anonymous visitors may download referenced live images,
-- but cannot list objects or mint signed URLs that outlive publication.
-- Requires Supabase's storage.allow_only_operation helper.
create policy "Download published product images" on storage.objects for select to anon
using (bucket_id = 'product-images' and storage.allow_only_operation('object.get_authenticated')
  and exists (
    select 1 from public.products p join public.websites w on w.id = p.website_id
    where p.image_path = storage.objects.name and w.status = 'published'
  ));
commit;
