begin;
create table public.products (
  id uuid primary key default gen_random_uuid(),
  website_id uuid not null references public.websites(id) on delete cascade,
  name text not null check (name = btrim(name) and char_length(name) between 1 and 120),
  description text not null default '' check (char_length(description) <= 5000),
  affiliate_url text not null check (char_length(affiliate_url) <= 2048 and affiliate_url ~ '^https?://[^[:space:]/?#@]+[^[:space:]]*$'),
  category_id uuid,
  merchant_id uuid,
  image_path text,
  revision integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (website_id, id),
  foreign key (website_id, category_id) references public.categories(website_id, id),
  foreign key (website_id, merchant_id) references public.merchants(website_id, id),
  constraint products_image_path check (image_path is null or
    (split_part(image_path, '/', 1) = website_id::text and
     image_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.webp$'))
);
create index products_website_created on public.products(website_id, created_at desc, id);
create index products_category on public.products(website_id, category_id);
create index products_merchant on public.products(website_id, merchant_id);
alter table public.products enable row level security;
alter table public.products force row level security;
revoke all on public.products from public, anon, authenticated;
grant select, delete on public.products to authenticated;
grant insert (website_id, name, description, affiliate_url, category_id, merchant_id, image_path) on public.products to authenticated;
grant update (name, description, affiliate_url, category_id, merchant_id, image_path) on public.products to authenticated;
create policy "Manage owned products" on public.products for all to authenticated
using (exists (select 1 from public.websites w where w.id = website_id and w.account_id = (select auth.uid())))
with check (exists (select 1 from public.websites w where w.id = website_id and w.account_id = (select auth.uid())));
create function public.set_product_revision() returns trigger language plpgsql set search_path = '' as $$
begin
  new.revision = old.revision + 1;
  new.updated_at = now();
  return new;
end;
$$;
revoke all on function public.set_product_revision() from public, anon, authenticated;
create trigger product_revision before update on public.products for each row execute function public.set_product_revision();
commit;
