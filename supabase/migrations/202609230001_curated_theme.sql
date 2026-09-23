begin;
-- Version 1 stays readable/renderable. Existing draft/published/previous JSON is
-- deliberately untouched. Only new websites receive version 2 automatically.
alter function public.validate_website_design(jsonb,uuid) rename to validate_website_design_v1;
create function public.theme_contrast(a text,b text) returns double precision
language sql immutable strict set search_path='' as $$
 select (greatest(public.branding_luminance(a),public.branding_luminance(b))+0.05)/(least(public.branding_luminance(a),public.branding_luminance(b))+0.05)
$$;
revoke all on function public.theme_contrast(text,text) from public,anon,authenticated;

create function public.validate_website_design(config jsonb, site uuid) returns boolean
language plpgsql stable set search_path='' as $$
declare core jsonb; settings jsonb; palette jsonb; s jsonb; sections jsonb:='[]'; item jsonb; k text; bg text; ident text;
begin
 if config->'version'='1'::jsonb then return public.validate_website_design_v1(config,site); end if;
 if config->'version' is distinct from '2'::jsonb or config->>'theme' is distinct from 'curated' or octet_length(config::text)>100000 then return false; end if;
 settings:=config->'settings';
 foreach k in array array['site_name','topic','footer_text'] loop
  if settings ? k and (jsonb_typeof(settings->k)<>'string' or char_length(settings->>k)>case k when 'site_name' then 80 when 'topic' then 100 else 500 end) then return false; end if;
 end loop;
 if settings ? 'font_pair' and coalesce(settings->>'font_pair','') not in ('editorial','modern','classic') then return false; end if;
 if settings ? 'button_style' and coalesce(settings->>'button_style','') not in ('pill','soft','square') then return false; end if;
 if settings ? 'card_style' and coalesce(settings->>'card_style','') not in ('soft','bordered','minimal') then return false; end if;
 if settings ? 'palette' then
  palette:=settings->'palette';
  if jsonb_typeof(palette)<>'object' or not palette ?& array['background','surface','text','accent'] or palette-array['background','surface','text','accent']<>'{}'::jsonb then return false; end if;
  foreach k in array array['background','surface','text','accent'] loop
   if jsonb_typeof(palette->k)<>'string' or palette->>k !~ '^#[0-9a-fA-F]{6}$' then return false; end if;
  end loop;
  foreach bg in array array[palette->>'background',palette->>'surface','#ffffff'] loop
   if public.theme_contrast(palette->>'text',bg)<4.5 or public.theme_contrast(palette->>'accent',bg)<4.5 then return false; end if;
  end loop;
 end if;
 if settings ? 'favicon_path' and settings->'favicon_path'<>'null'::jsonb then
  if jsonb_typeof(settings->'favicon_path')<>'string' or settings->>'favicon_path' !~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.webp$'
   or split_part(settings->>'favicon_path','/',1)<>site::text
   or not exists(select 1 from storage.objects where bucket_id='design-assets' and name=settings->>'favicon_path') then return false; end if;
 end if;
 if settings ? 'category_ids' then
  if jsonb_typeof(settings->'category_ids')<>'array' or jsonb_array_length(settings->'category_ids')>50 then return false; end if;
  if (select count(distinct value) from jsonb_array_elements(settings->'category_ids'))<>jsonb_array_length(settings->'category_ids') then return false; end if;
  for ident in select jsonb_array_elements_text(settings->'category_ids') loop
   if not exists(select 1 from public.categories where website_id=site and id::text=ident) then return false; end if;
  end loop;
 end if;
 if settings ? 'social_links' then
  if jsonb_typeof(settings->'social_links')<>'array' or jsonb_array_length(settings->'social_links')>6 then return false; end if;
  for item in select value from jsonb_array_elements(settings->'social_links') loop
   if jsonb_typeof(item)<>'object' or not item ?& array['label','url'] or item-array['label','url']<>'{}'::jsonb
    or jsonb_typeof(item->'label')<>'string' or char_length(trim(item->>'label')) not between 1 and 40
    or jsonb_typeof(item->'url')<>'string' or char_length(item->>'url')>500
    or item->>'url' !~ '^https://[^/[:space:]]+[^[:space:]]*$' then return false; end if;
  end loop;
 end if;
 for s in select value from jsonb_array_elements(config#>'{templates,home}') loop
  item:=s->'settings';
  if item ? 'cta_label' and (jsonb_typeof(item->'cta_label')<>'string' or char_length(item->>'cta_label')>50) then return false; end if;
  if item ? 'cta_target' and coalesce(item->>'cta_target','') not in ('catalog','categories','about') then return false; end if;
  if item ? 'image_position' and coalesce(item->>'image_position','') not in ('left','right') then return false; end if;
  if item ? 'image_fit' and coalesce(item->>'image_fit','') not in ('cover','contain') then return false; end if;
  s:=jsonb_set(s,'{settings}',item-array['cta_label','cta_target','image_position','image_fit']);
  if s->>'type' in ('categories','about') then s:=jsonb_set(s,'{type}','"text"'); end if;
  sections:=sections||jsonb_build_array(s);
 end loop;
 core:=jsonb_set(jsonb_set(config,'{version}','1'),'{theme}','"storefront"');
 core:=jsonb_set(core,'{settings}',settings-array['site_name','topic','favicon_path','palette','font_pair','button_style','card_style','footer_text','social_links','category_ids']);
 core:=jsonb_set(core,'{templates,home}',sections);
 return public.validate_website_design_v1(core,site);
exception when others then return false;
end $$;
revoke all on function public.validate_website_design(jsonb,uuid) from public,anon,authenticated;

create function public.initial_curated_design() returns jsonb
language plpgsql immutable set search_path='' as $$
declare d jsonb; s jsonb;
begin
 d:=public.initial_website_design('{"accent_color":"#2449c4","background":"ivory","heading_font":"sans","hero_title":"","hero_subtitle":"","logo_path":null}'::jsonb);
 d:=jsonb_set(jsonb_set(d,'{version}','2'),'{theme}','"curated"');
 d:=jsonb_set(d,'{settings}',(d->'settings')||'{"palette":{"background":"#fbfeff","surface":"#e8f8fc","text":"#063f5b","accent":"#006d89"},"font_pair":"editorial"}'::jsonb);
 s:=jsonb_build_object('id','theme-categories','type','categories','hidden',false,'blocks','[]'::jsonb,'settings',jsonb_build_object('title','Find your next favorite','body','','image_path',null,'alt','','alignment','left','product_ids','[]'::jsonb));
 d:=jsonb_set(d,'{templates,home}',(d#>'{templates,home}')||jsonb_build_array(s,jsonb_set(jsonb_set(jsonb_set(s,'{id}','"theme-about"'),'{type}','"about"'),'{settings,title}','"A little about us"')));
 return d;
end $$;
revoke all on function public.initial_curated_design() from public,anon,authenticated;
create or replace function public.seed_website_design() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 insert into public.website_designs(website_id,draft) values(new.id,public.initial_curated_design());
 return new;
end $$;

drop policy "Download published design assets" on storage.objects;
create policy "Download published design assets" on storage.objects for select to anon using (
 bucket_id='design-assets' and storage.allow_only_operation('object.get_authenticated') and exists(
 select 1 from public.website_designs d join public.websites w on w.id=d.website_id
 where w.status='published' and (d.published#>>'{settings,favicon_path}'=storage.objects.name or exists(
  select 1 from jsonb_array_elements(d.published#>'{templates,home}') s where s#>>'{settings,image_path}'=storage.objects.name))));
commit;
