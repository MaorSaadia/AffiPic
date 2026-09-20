-- Personal account foundation: one account per confirmed or pending auth user.
-- Websites will reference accounts.id in Day 3. No website tables are created here.
begin;

create table public.accounts (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 80),
  created_at timestamptz not null default now()
);
alter table public.accounts enable row level security;
alter table public.accounts force row level security;

revoke all on table public.accounts from public, anon, authenticated;
grant select on table public.accounts to authenticated;
grant update (display_name) on table public.accounts to authenticated;

create policy "Accounts can read their own record"
on public.accounts for select to authenticated
using ((select auth.uid()) = id);

create policy "Accounts can update their own display name"
on public.accounts for update to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create function public.handle_new_account()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.accounts (id, display_name)
  values (new.id, left(coalesce(new.raw_user_meta_data ->> 'display_name', ''), 80));
  return new;
end;
$$;
revoke all on function public.handle_new_account() from public, anon, authenticated;

create trigger on_auth_user_created_account
after insert on auth.users
for each row execute procedure public.handle_new_account();

-- Include users created before the migration; metadata is display-only, never authorization.
insert into public.accounts (id, display_name)
select id, left(coalesce(raw_user_meta_data ->> 'display_name', ''), 80)
from auth.users on conflict (id) do nothing;

commit;
