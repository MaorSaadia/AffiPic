begin;
-- Private drafts and public snapshots have separate column grants. No client can
-- write either directly; the RPCs lock the website and compare the revision.
create table public.website_designs (
 website_id uuid primary key references public.websites(id) on delete cascade,
 draft jsonb not null,
 published jsonb,
 previous_published jsonb,
 revision integer not null default 1,
 updated_at timestamptz not null default now()
);
alter table public.website_designs enable row level security;
alter table public.website_designs force row level security;
revoke all on public.website_designs from public, anon, authenticated;
grant select on public.website_designs to authenticated;
grant select(website_id,published) on public.website_designs to anon;
create policy "Read owned designs" on public.website_designs for select to authenticated using (
 exists(select 1 from public.websites w where w.id=website_id and w.account_id=(select auth.uid()))
);
create policy "Read published design snapshot" on public.website_designs for select to anon using (
 published is not null and exists(select 1 from public.websites w where w.id=website_id and w.status='published')
);

create function public.initial_website_design(branding jsonb) returns jsonb
language sql immutable set search_path='' as $$
 select jsonb_build_object('version',1,'theme','storefront','settings',branding,
 'shared',jsonb_build_object('header',jsonb_build_object('id','header','type','header'),'footer',jsonb_build_object('id','footer','type','footer')),
 'templates',jsonb_build_object('home',jsonb_build_array(
 jsonb_build_object('id','hero','type','hero','hidden',false,'blocks','[]'::jsonb,'settings',jsonb_build_object('title',branding->>'hero_title','body',branding->>'hero_subtitle','image_path',null,'alt','','alignment','left','product_ids','[]'::jsonb)),
 jsonb_build_object('id','catalog','type','catalog','hidden',false,'blocks','[]'::jsonb,'settings',jsonb_build_object('title','','body','','image_path',null,'alt','','alignment','left','product_ids','[]'::jsonb)))))
$$;
revoke all on function public.initial_website_design(jsonb) from public,anon,authenticated;

insert into public.website_designs(website_id,draft,published)
select w.id, public.initial_website_design(b.settings),
 case when w.status='published' then public.initial_website_design(b.settings) else null end
from public.websites w left join public.website_branding old on old.website_id=w.id
cross join lateral (select jsonb_build_object(
 'accent_color',coalesce(old.accent_color,'#2449c4'),'background',coalesce(old.background,'ivory'),
 'heading_font',coalesce(old.heading_font,'sans'),'hero_title',coalesce(old.hero_title,''),
 'hero_subtitle',coalesce(old.hero_subtitle,''),'logo_path',old.logo_path) settings) b;

create function public.seed_website_design() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 insert into public.website_designs(website_id,draft) values(new.id,public.initial_website_design(
 '{"accent_color":"#2449c4","background":"ivory","heading_font":"sans","hero_title":"","hero_subtitle":"","logo_path":null}'::jsonb));
 return new;
end $$;
revoke all on function public.seed_website_design() from public,anon,authenticated;
create trigger seed_website_design after insert on public.websites for each row execute function public.seed_website_design();

-- Shape and size checks also run for direct RPC calls, not only Server Actions.
create function public.validate_website_design(config jsonb, site uuid) returns boolean
language plpgsql stable set search_path='' as $$
declare s jsonb; t jsonb; p text; ids text[] := '{}'; catalogs integer := 0;
begin
 if config is null or octet_length(config::text)>100000 or jsonb_typeof(config)<>'object'
 or config->'version'<>'1'::jsonb or coalesce(config->>'theme','')<>'storefront'
 or not config ?& array['version','theme','settings','shared','templates']
 or config - array['version','theme','settings','shared','templates'] <> '{}'::jsonb
 or config->'shared' <> '{"header":{"id":"header","type":"header"},"footer":{"id":"footer","type":"footer"}}'::jsonb
 or jsonb_typeof(config->'templates')<>'object' or (config->'templates') - 'home'<>'{}'::jsonb
 or jsonb_typeof(config#>'{templates,home}')<>'array' then return false; end if;
 t := config->'settings';
 if jsonb_typeof(t)<>'object' or not t ?& array['accent_color','background','heading_font','hero_title','hero_subtitle','logo_path']
 or t - array['accent_color','background','heading_font','hero_title','hero_subtitle','logo_path'] <> '{}'::jsonb
 or jsonb_typeof(t->'accent_color')<>'string' or t->>'accent_color' !~ '^#[0-9a-f]{6}$'
 or (public.branding_luminance('#f1f5f9')+0.05)/(public.branding_luminance(t->>'accent_color')+0.05)<4.5
 or coalesce(t->>'background','') not in ('ivory','white','mist') or coalesce(t->>'heading_font','') not in ('sans','serif')
 or jsonb_typeof(t->'hero_title')<>'string' or char_length(t->>'hero_title')>120
 or jsonb_typeof(t->'hero_subtitle')<>'string' or char_length(t->>'hero_subtitle')>500 then return false; end if;
 if t->'logo_path'<>'null'::jsonb and (jsonb_typeof(t->'logo_path')<>'string' or split_part(t->>'logo_path','/',1)<>site::text
 or not exists(select 1 from storage.objects where bucket_id='website-logos' and name=t->>'logo_path')) then return false; end if;
 if jsonb_array_length(config#>'{templates,home}') not between 1 and 25 then return false; end if;
 for s in select value from jsonb_array_elements(config#>'{templates,home}') loop
  if jsonb_typeof(s)<>'object' or not s ?& array['id','type','hidden','settings','blocks']
  or s - array['id','type','hidden','settings','blocks']<>'{}'::jsonb
  or jsonb_typeof(s->'id')<>'string' or s->>'id' !~ '^[a-zA-Z0-9-]{1,64}$'
  or s->>'id'=any(ids) or s->>'id' in ('header','footer')
  or coalesce(s->>'type','') not in ('hero','catalog','text','image','products')
  or jsonb_typeof(s->'hidden')<>'boolean' or s->'blocks'<>'[]'::jsonb then return false; end if;
  ids := array_append(ids,s->>'id');
  if s->>'type'='catalog' then catalogs:=catalogs+1; end if;
  t:=s->'settings';
  if jsonb_typeof(t)<>'object' or not t ?& array['title','body','image_path','alt','alignment','product_ids']
  or t - array['title','body','image_path','alt','alignment','product_ids']<>'{}'::jsonb
  or jsonb_typeof(t->'title')<>'string' or char_length(t->>'title')>120
  or jsonb_typeof(t->'body')<>'string' or char_length(t->>'body')>2000
  or jsonb_typeof(t->'alt')<>'string' or char_length(t->>'alt')>200
  or coalesce(t->>'alignment','') not in ('left','center') or jsonb_typeof(t->'product_ids')<>'array'
  then return false; end if;
  if t->'image_path'<>'null'::jsonb and (jsonb_typeof(t->'image_path')<>'string' or split_part(t->>'image_path','/',1)<>site::text
  or not exists(select 1 from storage.objects where bucket_id='design-assets' and name=t->>'image_path')) then return false; end if;
  if jsonb_array_length(t->'product_ids')>12 or (select count(distinct value) from jsonb_array_elements(t->'product_ids'))<>jsonb_array_length(t->'product_ids') then return false; end if;
  for p in select jsonb_array_elements_text(t->'product_ids') loop
   if not exists(select 1 from public.products where website_id=site and id::text=p) then return false; end if;
  end loop;
 end loop;
 return catalogs=1;
exception when others then return false;
end $$;
revoke all on function public.validate_website_design(jsonb,uuid) from public,anon,authenticated;

create function public.save_website_design(config jsonb, expected_revision integer, publish_now boolean default false)
returns jsonb language plpgsql security definer set search_path='' as $$
declare site uuid; current_design public.website_designs; result public.website_designs;
begin
 select id into site from public.websites where account_id=(select auth.uid()) for update;
 if site is null then raise exception 'Website unavailable' using errcode='42501'; end if;
 select * into current_design from public.website_designs where website_id=site for update;
 if expected_revision is null or current_design.revision<>expected_revision then
  raise exception 'Design changed in another tab. Reload before saving.' using errcode='40001';
 end if;
 if not coalesce(public.validate_website_design(config,site),false) then raise exception 'Invalid design or unavailable catalog/image reference' using errcode='23514'; end if;
 if publish_now and not exists(select 1 from public.products where website_id=site) then
  raise exception 'Add at least one product before publishing' using errcode='23514'; end if;
 update public.website_designs set draft=config,
  previous_published=case when publish_now and published is distinct from config then published else previous_published end,
  published=case when publish_now then config else published end,
  revision=revision+1,updated_at=now() where website_id=site returning * into result;
 if publish_now then update public.websites set status='published' where id=site; end if;
 return jsonb_build_object('draft',result.draft,'published',result.published,'revision',result.revision);
end $$;
revoke all on function public.save_website_design(jsonb,integer,boolean) from public,anon,authenticated;
grant execute on function public.save_website_design(jsonb,integer,boolean) to authenticated;

-- Existing Settings publish/unpublish remains supported. A status-only publish
-- applies the saved draft in the same transaction. The designer RPC already set
-- its snapshot, so avoid double revision increments in that case.
create function public.publish_saved_website_design() returns trigger
language plpgsql security definer set search_path='' as $$
declare d public.website_designs;
begin
 if new.status='published' and old.status<>'published' then
  select * into d from public.website_designs where website_id=new.id for update;
  if not coalesce(public.validate_website_design(d.draft,new.id),false) then raise exception 'Invalid saved design' using errcode='23514'; end if;
  if d.published is distinct from d.draft then
   update public.website_designs set previous_published=published,published=draft,revision=revision+1,updated_at=now() where website_id=new.id;
  end if;
 end if;
 return new;
end $$;
revoke all on function public.publish_saved_website_design() from public,anon,authenticated;
create trigger publish_saved_website_design before update of status on public.websites for each row execute function public.publish_saved_website_design();

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('design-assets','design-assets',false,2097152,array['image/webp']);
create policy "Read owned design assets" on storage.objects for select to authenticated using (
 bucket_id='design-assets' and exists(select 1 from public.websites where id::text=split_part(storage.objects.name,'/',1) and account_id=(select auth.uid())));
create policy "Upload immutable owned design assets" on storage.objects for insert to authenticated with check (
 bucket_id='design-assets' and name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.webp$' and exists(select 1 from public.websites where id::text=split_part(storage.objects.name,'/',1) and account_id=(select auth.uid())));
-- No client update/delete: draft replacement cannot break published/previous assets.
create policy "Download published design assets" on storage.objects for select to anon using (
 bucket_id='design-assets' and storage.allow_only_operation('object.get_authenticated') and exists(
 select 1 from public.website_designs d join public.websites w on w.id=d.website_id,
 lateral jsonb_array_elements(d.published#>'{templates,home}') s
 where w.status='published' and s#>>'{settings,image_path}'=storage.objects.name));

-- Preserve migrated logos, including the rollback snapshot. The legacy editor
-- cannot remove an object referenced by a design snapshot.
drop policy "Delete unused owned logos" on storage.objects;
create policy "Delete unused owned logos" on storage.objects for delete to authenticated using (
 bucket_id='website-logos' and exists(select 1 from public.websites w where w.id::text=split_part(storage.objects.name,'/',1) and w.account_id=(select auth.uid()))
 and not exists(select 1 from public.website_branding b where b.logo_path=storage.objects.name)
 and not exists(select 1 from public.website_designs d where storage.objects.name in
 (d.draft#>>'{settings,logo_path}',d.published#>>'{settings,logo_path}',d.previous_published#>>'{settings,logo_path}')));
drop policy "Download published logos" on storage.objects;
create policy "Download published logos" on storage.objects for select to anon using (
 bucket_id='website-logos' and storage.allow_only_operation('object.get_authenticated') and exists(
 select 1 from public.website_designs d join public.websites w on w.id=d.website_id
 where w.status='published' and d.published#>>'{settings,logo_path}'=storage.objects.name));
revoke insert(website_id,accent_color,background,heading_font,hero_title,hero_subtitle,logo_path),
 update(accent_color,background,heading_font,hero_title,hero_subtitle,logo_path) on public.website_branding from authenticated;
commit;
