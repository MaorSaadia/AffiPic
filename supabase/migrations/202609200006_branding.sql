begin;
-- Same sRGB contrast calculation used by the editor, enforced for direct writes too.
create function public.branding_luminance(color text) returns double precision
language plpgsql immutable strict set search_path = '' as $$
declare rgb bytea; v double precision; result double precision := 0; weights double precision[] := array[0.2126,0.7152,0.0722];
begin
 if color !~ '^#[0-9a-fA-F]{6}$' then return null; end if;
 rgb := decode(substr(color,2),'hex');
 for i in 0..2 loop
  v := get_byte(rgb,i)::double precision / 255;
  if v <= 0.04045 then v := v/12.92; else v := power((v+0.055)/1.055,2.4); end if;
  result := result + v*weights[i+1];
 end loop;
 return result;
end;
$$;
revoke all on function public.branding_luminance(text) from public;
grant execute on function public.branding_luminance(text) to authenticated, anon;
create table public.website_branding (
 website_id uuid primary key references public.websites(id) on delete cascade,
 accent_color text not null default '#2449c4' check (
  accent_color ~ '^#[0-9a-f]{6}$' and
  (public.branding_luminance('#f1f5f9')+0.05)/(public.branding_luminance(accent_color)+0.05) >= 4.5
 ),
 background text not null default 'ivory' check (background in ('ivory','white','mist')),
 heading_font text not null default 'sans' check (heading_font in ('sans','serif')),
 hero_title text not null default '' check (char_length(hero_title)<=120),
 hero_subtitle text not null default '' check (char_length(hero_subtitle)<=500),
 logo_path text check (logo_path is null or (
  split_part(logo_path,'/',1)=website_id::text and logo_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.webp$'
 )),
 revision integer not null default 1,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
alter table public.website_branding enable row level security;
alter table public.website_branding force row level security;
revoke all on public.website_branding from public, anon, authenticated;
grant select on public.website_branding to authenticated;
grant insert(website_id,accent_color,background,heading_font,hero_title,hero_subtitle,logo_path) on public.website_branding to authenticated;
grant update(accent_color,background,heading_font,hero_title,hero_subtitle,logo_path) on public.website_branding to authenticated;
grant select(website_id,accent_color,background,heading_font,hero_title,hero_subtitle,logo_path) on public.website_branding to anon;
create policy "Manage owned branding" on public.website_branding for all to authenticated
using (exists(select 1 from public.websites w where w.id=website_branding.website_id and w.account_id=(select auth.uid())))
with check (exists(select 1 from public.websites w where w.id=website_branding.website_id and w.account_id=(select auth.uid())));
create policy "Read published branding" on public.website_branding for select to anon
using (exists(select 1 from public.websites w where w.id=website_branding.website_id and w.status='published'));
create trigger branding_revision before update on public.website_branding
for each row execute function public.set_product_revision();

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('website-logos','website-logos',false,1048576,array['image/webp']);
create policy "Read owned logos" on storage.objects for select to authenticated
using (bucket_id='website-logos' and exists(select 1 from public.websites w where w.id::text=split_part(storage.objects.name,'/',1) and w.account_id=(select auth.uid())));
create policy "Upload owned logos" on storage.objects for insert to authenticated
with check (bucket_id='website-logos' and name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.webp$' and exists(select 1 from public.websites w where w.id::text=split_part(storage.objects.name,'/',1) and w.account_id=(select auth.uid())));
create policy "Delete unused owned logos" on storage.objects for delete to authenticated
using (bucket_id='website-logos' and exists(select 1 from public.websites w where w.id::text=split_part(storage.objects.name,'/',1) and w.account_id=(select auth.uid()))
 and not exists(select 1 from public.website_branding b where b.logo_path=storage.objects.name));
create policy "Download published logos" on storage.objects for select to anon
using (bucket_id='website-logos' and storage.allow_only_operation('object.get_authenticated')
 and exists(select 1 from public.website_branding b join public.websites w on w.id=b.website_id where b.logo_path=storage.objects.name and w.status='published'));
commit;
