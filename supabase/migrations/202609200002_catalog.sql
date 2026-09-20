-- Day 4: website-owned categories and merchants.
begin;

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  website_id uuid not null references public.websites(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 80 and name = btrim(name)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (website_id, id)
);
create unique index categories_website_name_unique on public.categories (website_id, lower(name));
alter table public.categories enable row level security;
alter table public.categories force row level security;
revoke all on public.categories from public, anon, authenticated;
grant select, delete on public.categories to authenticated;
grant insert (website_id, name) on public.categories to authenticated;
grant update (name) on public.categories to authenticated;
create policy "Manage owned categories" on public.categories for all to authenticated
using (exists (select 1 from public.websites w where w.id = website_id and w.account_id = (select auth.uid())))
with check (exists (select 1 from public.websites w where w.id = website_id and w.account_id = (select auth.uid())));
create trigger categories_updated_at before update on public.categories
for each row execute function public.set_website_updated_at();


create table public.merchants (
  id uuid primary key default gen_random_uuid(),
  website_id uuid not null references public.websites(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 80 and name = btrim(name)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (website_id, id)
);
create unique index merchants_website_name_unique on public.merchants (website_id, lower(name));
alter table public.merchants enable row level security;
alter table public.merchants force row level security;
revoke all on public.merchants from public, anon, authenticated;
grant select, delete on public.merchants to authenticated;
grant insert (website_id, name) on public.merchants to authenticated;
grant update (name) on public.merchants to authenticated;
create policy "Manage owned merchants" on public.merchants for all to authenticated
using (exists (select 1 from public.websites w where w.id = website_id and w.account_id = (select auth.uid())))
with check (exists (select 1 from public.websites w where w.id = website_id and w.account_id = (select auth.uid())));
create trigger merchants_updated_at before update on public.merchants
for each row execute function public.set_website_updated_at();

commit;
