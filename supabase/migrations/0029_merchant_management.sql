alter table public.restaurants
  add column if not exists is_paused boolean not null default false;
alter table public.restaurants
  add column if not exists paused_until timestamptz;
alter table public.restaurants
  add column if not exists avg_prep_minutes int not null default 20;

do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conname = 'restaurants_avg_prep_minutes_check'
       and conrelid = 'public.restaurants'::regclass
  ) then
    alter table public.restaurants
      add constraint restaurants_avg_prep_minutes_check
      check (avg_prep_minutes between 5 and 120);
  end if;
end
$$;

create table if not exists public.merchant_actions (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  actor_id uuid references auth.users (id) on delete set null,
  action text not null,
  subject_type text not null,
  subject_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists merchant_actions_restaurant_idx
  on public.merchant_actions (restaurant_id, created_at desc);
create index if not exists merchant_actions_subject_idx
  on public.merchant_actions (subject_type, subject_id);

alter table public.merchant_actions enable row level security;

drop policy if exists "read own merchant actions" on public.merchant_actions;
create policy "read own merchant actions" on public.merchant_actions
  for select using (public.manages_restaurant(restaurant_id));

revoke insert, update, delete on public.merchant_actions from anon, authenticated;

create or replace function public.log_merchant_action(
  p_restaurant_id uuid,
  p_action text,
  p_subject_type text,
  p_subject_id text,
  p_details jsonb default '{}'::jsonb
)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.merchant_actions
    (restaurant_id, actor_id, action, subject_type, subject_id, details)
  values
    (p_restaurant_id, auth.uid(), p_action, p_subject_type, p_subject_id,
     coalesce(p_details, '{}'::jsonb));
$$;

revoke all on function public.log_merchant_action(uuid, text, text, text, jsonb)
  from public, anon, authenticated;

create or replace function public.require_restaurant_manager(p_restaurant_id uuid)
returns void
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'You must be signed in' using errcode = '28000';
  end if;

  if not public.manages_restaurant(p_restaurant_id) then
    raise exception 'You do not manage this restaurant' using errcode = '42501';
  end if;
end;
$$;

revoke all on function public.require_restaurant_manager(uuid) from public, anon;
grant execute on function public.require_restaurant_manager(uuid) to authenticated;

create or replace function public.is_restaurant_open(
  p_restaurant_id uuid,
  p_at timestamptz default now()
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_is_open boolean;
  v_is_paused boolean;
  v_paused_until timestamptz;
  v_timezone text;
  v_local timestamp;
  v_dow int;
  v_time time;
  v_has_hours boolean;
begin
  select r.is_open, r.is_paused, r.paused_until, coalesce(r.timezone, s.default_timezone)
    into v_is_open, v_is_paused, v_paused_until, v_timezone
    from public.restaurants r
    cross join public.platform_settings s
   where r.id = p_restaurant_id;

  if not found or not v_is_open then
    return false;
  end if;

  if v_is_paused and (v_paused_until is null or v_paused_until > p_at) then
    return false;
  end if;

  select exists (select 1 from public.restaurant_hours where restaurant_id = p_restaurant_id)
    into v_has_hours;

  if not v_has_hours then
    return true;
  end if;

  v_local := p_at at time zone v_timezone;
  v_dow := extract(dow from v_local)::int;
  v_time := v_local::time;

  return exists (
    select 1
      from public.restaurant_hours h
     where h.restaurant_id = p_restaurant_id
       and (
         (h.closes_at > h.opens_at
           and h.day_of_week = v_dow
           and v_time >= h.opens_at
           and v_time < h.closes_at)
         or (h.closes_at <= h.opens_at
           and (
             (h.day_of_week = v_dow and v_time >= h.opens_at)
             or (h.day_of_week = (v_dow + 6) % 7 and v_time < h.closes_at)
           ))
       )
  );
end;
$$;

revoke all on function public.is_restaurant_open(uuid, timestamptz) from public;
grant execute on function public.is_restaurant_open(uuid, timestamptz) to anon, authenticated;

