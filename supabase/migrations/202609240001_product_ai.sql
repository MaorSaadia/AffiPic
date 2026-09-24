-- Additive controlled beta. No catalog or design writes. Run after prior migrations.
begin;
create table public.ai_limits (
 id boolean primary key default true check (id),
 daily_success_limit integer not null default 10 check (daily_success_limit between 1 and 1000),
 cooldown_seconds integer not null default 10 check (cooldown_seconds between 1 and 3600),
 -- Fail closed until an operator checks the actual project/model quota in AI Studio.
 global_daily_attempt_limit integer not null default 0 check (global_daily_attempt_limit between 0 and 100000)
);
insert into public.ai_limits(id) values (true);
create table public.ai_requests (
 request_id uuid primary key,
 account_id uuid references public.accounts(id) on delete set null,
 website_id uuid references public.websites(id) on delete set null,
 status text not null check (status in ('running','succeeded','failed','expired')),
 model text not null check (char_length(model) between 1 and 100),
 created_at timestamptz not null default clock_timestamp(),
 expires_at timestamptz not null,
 finished_at timestamptz,
 input_tokens integer check (input_tokens >= 0),
 output_tokens integer check (output_tokens >= 0)
);
create index ai_requests_account_time on public.ai_requests(account_id,created_at desc);
create index ai_requests_time on public.ai_requests(created_at);
create unique index ai_requests_one_running on public.ai_requests(account_id) where status='running';
alter table public.ai_limits enable row level security;
alter table public.ai_requests enable row level security;
revoke all on public.ai_limits,public.ai_requests from public,anon,authenticated;
grant select,update on public.ai_limits to service_role;
-- Operational records are read through these server-only functions, never client APIs.
create function public.ai_allowance(p_account uuid, p_website uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare lim public.ai_limits; used integer; day_start timestamptz;
begin
 if not exists(select 1 from public.websites where id=p_website and account_id=p_account) then
  return jsonb_build_object('code','ownership');
 end if;
 select * into strict lim from public.ai_limits where id;
 day_start := date_trunc('day',clock_timestamp() at time zone 'UTC') at time zone 'UTC';
 select count(*) into used from public.ai_requests where account_id=p_account and created_at>=day_start and status='succeeded';
 return jsonb_build_object('code','ready','remaining',greatest(0,lim.daily_success_limit-used),'resetAt',day_start+interval '1 day');
end $$;

create function public.ai_reserve(p_account uuid,p_website uuid,p_product uuid,p_request uuid,p_model text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare lim public.ai_limits; stamp timestamptz; day_start timestamptz; allowance jsonb; last_attempt timestamptz;
begin
 -- All reservations/finalizations share this row lock, including across websites/accounts.
 -- The network call occurs AFTER the transaction releases the lock.
 select * into strict lim from public.ai_limits where id for update;
 stamp := clock_timestamp();
 day_start := date_trunc('day',stamp at time zone 'UTC') at time zone 'UTC';
 allowance := public.ai_allowance(p_account,p_website);
 if allowance->>'code'='ownership' or (p_product is not null and not exists(
  select 1 from public.products where id=p_product and website_id=p_website
 )) then return jsonb_build_object('code','ownership'); end if;
 if p_request is null or p_model is null or char_length(p_model) not between 1 and 100 then
  return jsonb_build_object('code','invalid');
 end if;
 update public.ai_requests set status='expired',finished_at=stamp where account_id=p_account and status='running' and expires_at<=stamp;
 if exists(select 1 from public.ai_requests where request_id=p_request) then
  return allowance || jsonb_build_object('code','duplicate');
 end if;
 if exists(select 1 from public.ai_requests where account_id=p_account and status='running') then
  return allowance || jsonb_build_object('code','running');
 end if;
 if (allowance->>'remaining')::integer=0 then return allowance || jsonb_build_object('code','exhausted'); end if;
 select max(created_at) into last_attempt from public.ai_requests where account_id=p_account;
 if last_attempt+make_interval(secs=>lim.cooldown_seconds)>stamp then
  return allowance || jsonb_build_object('code','cooldown','retryAt',last_attempt+make_interval(secs=>lim.cooldown_seconds));
 end if;
 if (select count(*) from public.ai_requests where created_at>=day_start)>=lim.global_daily_attempt_limit then
  return allowance || jsonb_build_object('code','capacity');
 end if;
 -- Do not begin calls too close to UTC rollover; successful requests belong to one UTC day.
 if stamp+interval '30 seconds'>=day_start+interval '1 day' then
  return allowance || jsonb_build_object('code','cooldown','retryAt',day_start+interval '1 day');
 end if;
 insert into public.ai_requests(request_id,account_id,website_id,status,model,created_at,expires_at)
 values(p_request,p_account,p_website,'running',p_model,stamp,least(stamp+interval '2 minutes',day_start+interval '1 day'));
 return allowance || jsonb_build_object('code','reserved');
end $$;

create function public.ai_finish(p_account uuid,p_request uuid,p_success boolean,p_input integer default null,p_output integer default null) returns boolean
language plpgsql security definer set search_path='' as $$
declare stamp timestamptz; result boolean;
begin
 perform 1 from public.ai_limits where id for update;
 stamp := clock_timestamp();
 update public.ai_requests set status=case when expires_at<=stamp then 'expired' when p_success then 'succeeded' else 'failed' end,
 finished_at=stamp,input_tokens=p_input,output_tokens=p_output
 where request_id=p_request and account_id=p_account and status='running'
 returning status='succeeded' into result;
 return coalesce(result,false);
end $$;
revoke all on function public.ai_allowance(uuid,uuid), public.ai_reserve(uuid,uuid,uuid,uuid,text), public.ai_finish(uuid,uuid,boolean,integer,integer) from public,anon,authenticated;
grant execute on function public.ai_allowance(uuid,uuid), public.ai_reserve(uuid,uuid,uuid,uuid,text), public.ai_finish(uuid,uuid,boolean,integer,integer) to service_role;
commit;
