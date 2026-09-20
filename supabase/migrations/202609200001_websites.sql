-- Day 3: one private draft website per personal account. Publishing comes later.
begin;
create table public.websites (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null default auth.uid() references public.accounts(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 80 and name = btrim(name)),
  slug text not null,
  description text not null default '' check (char_length(description) <= 500),
  status text not null default 'draft' check (status = 'draft'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint websites_one_per_account unique (account_id),
  constraint websites_slug_unique unique (slug),
  constraint websites_slug_format check (
    char_length(slug) between 3 and 48
    and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
    and slug not in ('admin', 'api', 'app', 'auth', 'billing', 'dashboard', 'help', 'login', 'logout', 'new', 'settings', 'signup', 'support', 'www', 'affipic')
  )
);
alter table public.websites enable row level security;
alter table public.websites force row level security;
revoke all on table public.websites from public, anon, authenticated;
grant select on table public.websites to authenticated;
-- The database derives ownership. Clients cannot supply or change IDs, ownership, or status.
grant insert (name, slug, description) on public.websites to authenticated;
grant update (name, slug, description) on public.websites to authenticated;
create policy "Read owned websites" on public.websites for select to authenticated
using ((select auth.uid()) = account_id);
create policy "Create owned websites" on public.websites for insert to authenticated
with check ((select auth.uid()) = account_id);
create policy "Update owned websites" on public.websites for update to authenticated
using ((select auth.uid()) = account_id) with check ((select auth.uid()) = account_id);

create function public.set_website_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
revoke all on function public.set_website_updated_at() from public, anon, authenticated;
create trigger website_updated_at before update on public.websites
for each row execute function public.set_website_updated_at();
commit;
