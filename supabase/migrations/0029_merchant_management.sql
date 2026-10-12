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

drop policy if exists "manage dishes" on public.dishes;
drop policy if exists "manage menu_categories" on public.menu_categories;
drop policy if exists "manage dish_addons" on public.dish_addons;
drop policy if exists "manage restaurant_hours" on public.restaurant_hours;
drop policy if exists "manage own restaurant" on public.restaurants;

revoke insert, update, delete on public.dishes from anon, authenticated;
revoke insert, update, delete on public.menu_categories from anon, authenticated;
revoke insert, update, delete on public.dish_addons from anon, authenticated;
revoke insert, update, delete on public.restaurant_hours from anon, authenticated;
revoke insert, update, delete on public.restaurants from anon, authenticated;

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

create or replace function public.merchant_set_dish_available(
  p_dish_id uuid,
  p_is_available boolean
)
returns public.dishes
language plpgsql
security definer
set search_path = public
as $$
declare
  v_dish public.dishes%rowtype;
begin
  select * into v_dish from public.dishes where id = p_dish_id;

  if not found then
    raise exception 'Dish not found' using errcode = 'P0002';
  end if;

  perform public.require_restaurant_manager(v_dish.restaurant_id);

  if p_is_available is null then
    raise exception 'Availability is required' using errcode = '22023';
  end if;

  update public.dishes
     set is_available = p_is_available
   where id = p_dish_id
  returning * into v_dish;

  perform public.log_merchant_action(
    v_dish.restaurant_id,
    case when p_is_available then 'dish_enabled' else 'dish_disabled' end,
    'dish',
    p_dish_id::text,
    jsonb_build_object('name', v_dish.name, 'is_available', p_is_available)
  );

  return v_dish;
end;
$$;

revoke all on function public.merchant_set_dish_available(uuid, boolean) from public, anon;
grant execute on function public.merchant_set_dish_available(uuid, boolean) to authenticated;

create or replace function public.merchant_update_dish(
  p_dish_id uuid,
  p_name text default null,
  p_description text default null,
  p_price numeric default null,
  p_is_available boolean default null,
  p_is_popular boolean default null,
  p_dietary_tags text[] default null
)
returns public.dishes
language plpgsql
security definer
set search_path = public
as $$
declare
  v_dish public.dishes%rowtype;
  v_name text;
  v_description text;
  v_price numeric(6,2);
  v_tags text[];
  v_tag text;
begin
  select * into v_dish from public.dishes where id = p_dish_id;

  if not found then
    raise exception 'Dish not found' using errcode = 'P0002';
  end if;

  perform public.require_restaurant_manager(v_dish.restaurant_id);

  v_name := coalesce(nullif(btrim(p_name), ''), v_dish.name);
  if length(v_name) > 80 then
    raise exception 'A dish name is at most 80 characters' using errcode = '22023';
  end if;

  v_description := case
    when p_description is null then v_dish.description
    else nullif(btrim(p_description), '')
  end;
  if v_description is not null and length(v_description) > 500 then
    raise exception 'A dish description is at most 500 characters' using errcode = '22023';
  end if;

  v_price := coalesce(round(p_price, 2), v_dish.price);
  if v_price <= 0 then
    raise exception 'A price must be greater than zero' using errcode = '22023';
  end if;
  if v_price > 9999.99 then
    raise exception 'A price must be at most 9999.99' using errcode = '22023';
  end if;

  v_tags := coalesce(p_dietary_tags, v_dish.dietary_tags);
  if coalesce(array_length(v_tags, 1), 0) > 10 then
    raise exception 'A dish takes at most 10 dietary tags' using errcode = '22023';
  end if;
  foreach v_tag in array v_tags loop
    if btrim(v_tag) = '' or length(v_tag) > 24 then
      raise exception 'A dietary tag is between 1 and 24 characters' using errcode = '22023';
    end if;
  end loop;

  update public.dishes
     set name = v_name,
         description = v_description,
         price = v_price,
         is_available = coalesce(p_is_available, v_dish.is_available),
         is_popular = coalesce(p_is_popular, v_dish.is_popular),
         dietary_tags = v_tags
   where id = p_dish_id
  returning * into v_dish;

  perform public.log_merchant_action(
    v_dish.restaurant_id,
    'dish_updated',
    'dish',
    p_dish_id::text,
    jsonb_build_object(
      'name', v_dish.name,
      'price', v_dish.price,
      'is_available', v_dish.is_available,
      'is_popular', v_dish.is_popular,
      'dietary_tags', to_jsonb(v_dish.dietary_tags)
    )
  );

  return v_dish;
end;
$$;

revoke all on function public.merchant_update_dish(
  uuid, text, text, numeric, boolean, boolean, text[]) from public, anon;
grant execute on function public.merchant_update_dish(
  uuid, text, text, numeric, boolean, boolean, text[]) to authenticated;

create or replace function public.merchant_set_restaurant_hours(
  p_restaurant_id uuid,
  p_hours jsonb
)
returns setof public.restaurant_hours
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row jsonb;
  v_day int;
  v_opens time;
  v_closes time;
  v_count int := 0;
begin
  perform public.require_restaurant_manager(p_restaurant_id);

  if p_hours is null or jsonb_typeof(p_hours) <> 'array' then
    raise exception 'Opening hours must be an array' using errcode = '22023';
  end if;

  if jsonb_array_length(p_hours) > 21 then
    raise exception 'At most three opening ranges per day' using errcode = '22023';
  end if;

  delete from public.restaurant_hours where restaurant_id = p_restaurant_id;

  for v_row in select value from jsonb_array_elements(p_hours) loop
    v_day := (v_row ->> 'day_of_week')::int;

    if v_day is null or v_day < 0 or v_day > 6 then
      raise exception 'A day of week is between 0 and 6' using errcode = '22023';
    end if;

    begin
      v_opens := (v_row ->> 'opens_at')::time;
      v_closes := (v_row ->> 'closes_at')::time;
    exception
      when others then
        raise exception 'Opening hours must look like 09:00' using errcode = '22023';
    end;

    if v_opens is null or v_closes is null then
      raise exception 'Both an opening and a closing time are required' using errcode = '22023';
    end if;

    if v_opens = v_closes then
      raise exception 'A closing time must differ from its opening time' using errcode = '22023';
    end if;

    insert into public.restaurant_hours (restaurant_id, day_of_week, opens_at, closes_at)
    values (p_restaurant_id, v_day, v_opens, v_closes)
    on conflict (restaurant_id, day_of_week, opens_at) do update
      set closes_at = excluded.closes_at;

    v_count := v_count + 1;
  end loop;

  perform public.log_merchant_action(
    p_restaurant_id,
    'hours_updated',
    'restaurant',
    p_restaurant_id::text,
    jsonb_build_object('ranges', v_count)
  );

  return query
    select * from public.restaurant_hours
     where restaurant_id = p_restaurant_id
     order by day_of_week, opens_at;
end;
$$;

revoke all on function public.merchant_set_restaurant_hours(uuid, jsonb) from public, anon;
grant execute on function public.merchant_set_restaurant_hours(uuid, jsonb) to authenticated;

create or replace function public.merchant_set_store_paused(
  p_restaurant_id uuid,
  p_paused boolean,
  p_until timestamptz default null
)
returns public.restaurants
language plpgsql
security definer
set search_path = public
as $$
declare
  v_restaurant public.restaurants%rowtype;
  v_until timestamptz;
begin
  perform public.require_restaurant_manager(p_restaurant_id);

  if p_paused is null then
    raise exception 'Pass whether the store is paused' using errcode = '22023';
  end if;

  v_until := case when p_paused then p_until else null end;

  if v_until is not null and v_until <= now() then
    raise exception 'A pause has to end in the future' using errcode = '22023';
  end if;

  if v_until is not null and v_until > now() + interval '7 days' then
    raise exception 'A pause lasts at most 7 days' using errcode = '22023';
  end if;

  update public.restaurants
     set is_paused = p_paused,
         paused_until = v_until
   where id = p_restaurant_id
  returning * into v_restaurant;

  if not found then
    raise exception 'Restaurant not found' using errcode = 'P0002';
  end if;

  perform public.log_merchant_action(
    p_restaurant_id,
    case when p_paused then 'store_paused' else 'store_resumed' end,
    'restaurant',
    p_restaurant_id::text,
    jsonb_build_object('paused_until', v_until)
  );

  return v_restaurant;
end;
$$;

revoke all on function public.merchant_set_store_paused(uuid, boolean, timestamptz)
  from public, anon;
grant execute on function public.merchant_set_store_paused(uuid, boolean, timestamptz)
  to authenticated;

create or replace function public.merchant_set_prep_time(
  p_restaurant_id uuid,
  p_minutes int
)
returns public.restaurants
language plpgsql
security definer
set search_path = public
as $$
declare
  v_restaurant public.restaurants%rowtype;
begin
  perform public.require_restaurant_manager(p_restaurant_id);

  if p_minutes is null or p_minutes < 5 or p_minutes > 120 then
    raise exception 'A preparation time is between 5 and 120 minutes' using errcode = '22023';
  end if;

  update public.restaurants
     set avg_prep_minutes = p_minutes
   where id = p_restaurant_id
  returning * into v_restaurant;

  if not found then
    raise exception 'Restaurant not found' using errcode = 'P0002';
  end if;

  perform public.log_merchant_action(
    p_restaurant_id,
    'prep_time_updated',
    'restaurant',
    p_restaurant_id::text,
    jsonb_build_object('minutes', p_minutes)
  );

  return v_restaurant;
end;
$$;

revoke all on function public.merchant_set_prep_time(uuid, int) from public, anon;
grant execute on function public.merchant_set_prep_time(uuid, int) to authenticated;

create or replace function public.merchant_menu(p_restaurant_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_menu jsonb;
begin
  perform public.require_restaurant_manager(p_restaurant_id);

  select coalesce(jsonb_agg(category order by category -> 'sort_order', category -> 'name'), '[]'::jsonb)
    into v_menu
    from (
      select jsonb_build_object(
               'id', c.id,
               'name', c.name,
               'subtitle', c.subtitle,
               'sort_order', c.sort_order,
               'dishes', coalesce((
                 select jsonb_agg(
                          jsonb_build_object(
                            'id', d.id,
                            'restaurant_id', d.restaurant_id,
                            'menu_category_id', d.menu_category_id,
                            'name', d.name,
                            'description', d.description,
                            'price', d.price,
                            'image_url', d.image_url,
                            'is_popular', d.is_popular,
                            'is_available', d.is_available,
                            'dietary_tags', to_jsonb(d.dietary_tags),
                            'sort_order', d.sort_order
                          )
                          order by d.sort_order, d.name
                        )
                   from public.dishes d
                  where d.menu_category_id = c.id
               ), '[]'::jsonb)
             ) as category
        from public.menu_categories c
       where c.restaurant_id = p_restaurant_id
    ) categories;

  return v_menu;
end;
$$;

revoke all on function public.merchant_menu(uuid) from public, anon;
grant execute on function public.merchant_menu(uuid) to authenticated;

create or replace function public.merchant_update_restaurant(
  p_restaurant_id uuid,
  p_name text default null,
  p_description text default null,
  p_delivery_fee numeric default null,
  p_min_order numeric default null
)
returns public.restaurants
language plpgsql
security definer
set search_path = public
as $$
declare
  v_restaurant public.restaurants%rowtype;
  v_name text;
  v_description text;
  v_delivery_fee numeric(6,2);
  v_min_order numeric(6,2);
begin
  perform public.require_restaurant_manager(p_restaurant_id);

  select * into v_restaurant from public.restaurants where id = p_restaurant_id;

  if not found then
    raise exception 'Restaurant not found' using errcode = 'P0002';
  end if;

  v_name := coalesce(nullif(btrim(p_name), ''), v_restaurant.name);
  if length(v_name) > 80 then
    raise exception 'A restaurant name is at most 80 characters' using errcode = '22023';
  end if;

  v_description := case
    when p_description is null then v_restaurant.description
    else nullif(btrim(p_description), '')
  end;
  if v_description is not null and length(v_description) > 500 then
    raise exception 'A restaurant description is at most 500 characters' using errcode = '22023';
  end if;

  v_delivery_fee := coalesce(round(p_delivery_fee, 2), v_restaurant.delivery_fee);
  if v_delivery_fee < 0 or v_delivery_fee > 50 then
    raise exception 'A delivery fee is between 0 and 50' using errcode = '22023';
  end if;

  v_min_order := coalesce(round(p_min_order, 2), v_restaurant.min_order);
  if v_min_order < 0 or v_min_order > 200 then
    raise exception 'A minimum order is between 0 and 200' using errcode = '22023';
  end if;

  update public.restaurants
     set name = v_name,
         description = v_description,
         delivery_fee = v_delivery_fee,
         min_order = v_min_order
   where id = p_restaurant_id
  returning * into v_restaurant;

  perform public.log_merchant_action(
    p_restaurant_id,
    'restaurant_updated',
    'restaurant',
    p_restaurant_id::text,
    jsonb_build_object(
      'name', v_restaurant.name,
      'delivery_fee', v_restaurant.delivery_fee,
      'min_order', v_restaurant.min_order
    )
  );

  return v_restaurant;
end;
$$;

revoke all on function public.merchant_update_restaurant(uuid, text, text, numeric, numeric)
  from public, anon;
grant execute on function public.merchant_update_restaurant(uuid, text, text, numeric, numeric)
  to authenticated;
