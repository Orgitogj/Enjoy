alter table public.orders add column if not exists eta_at timestamptz;
alter table public.orders add column if not exists eta_min_at timestamptz;
alter table public.orders add column if not exists eta_max_at timestamptz;
alter table public.orders add column if not exists eta_updated_at timestamptz;

alter table public.deliveries add column if not exists eta_at timestamptz;
alter table public.deliveries add column if not exists eta_updated_at timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
     where n.nspname = 'public' and t.typname = 'delivery_eta'
  ) then
    create type public.delivery_eta as (
      order_id uuid,
      stage text,
      prep_minutes int,
      travel_minutes int,
      total_minutes int,
      distance_km numeric(6,2),
      eta_at timestamptz,
      eta_min_at timestamptz,
      eta_max_at timestamptz
    );
  end if;
end
$$;

create or replace function public.vehicle_speed_kmh(p_vehicle text)
returns numeric
language sql
immutable
as $$
  select case coalesce(p_vehicle, 'bicycle')
    when 'on_foot' then 5.0
    when 'bicycle' then 15.0
    when 'scooter' then 25.0
    when 'car' then 30.0
    else 15.0
  end::numeric;
$$;

revoke all on function public.vehicle_speed_kmh(text) from public;
grant execute on function public.vehicle_speed_kmh(text) to anon, authenticated;

create or replace function public.travel_minutes_for(p_distance_km numeric, p_vehicle text)
returns int
language sql
immutable
as $$
  select case
    when coalesce(p_distance_km, 0) <= 0 then 0
    else greatest(1, ceil(p_distance_km / public.vehicle_speed_kmh(p_vehicle) * 60))::int
  end;
$$;

revoke all on function public.travel_minutes_for(numeric, text) from public;
grant execute on function public.travel_minutes_for(numeric, text) to anon, authenticated;

create or replace function public.eta_window_minutes(p_total_minutes int)
returns int
language sql
immutable
as $$
  select greatest(10, ceil(greatest(coalesce(p_total_minutes, 0), 0) * 0.3))::int;
$$;

revoke all on function public.eta_window_minutes(int) from public;
grant execute on function public.eta_window_minutes(int) to anon, authenticated;

create or replace function public.compute_delivery_eta_for(p_order public.orders)
returns public.delivery_eta
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v public.delivery_eta;
  v_order public.orders%rowtype := p_order;
  v_restaurant public.restaurants%rowtype;
  v_delivery public.deliveries%rowtype;
  v_vehicle text := 'bicycle';
  v_courier_lat double precision;
  v_courier_lon double precision;
  v_drop_lat double precision;
  v_drop_lon double precision;
  v_accepted_at timestamptz;
  v_prep_elapsed int;
  v_window int;
begin
  if v_order.id is null then
    return null;
  end if;

  v.order_id := v_order.id;
  v.prep_minutes := 0;
  v.travel_minutes := 0;
  v.distance_km := 0;

  select * into v_restaurant from public.restaurants where id = v_order.restaurant_id;
  select * into v_delivery from public.deliveries where order_id = v_order.id;

  if v_delivery.courier_id is not null then
    select c.vehicle_type, c.current_latitude, c.current_longitude
      into v_vehicle, v_courier_lat, v_courier_lon
      from public.couriers c
     where c.id = v_delivery.courier_id;

    select l.latitude, l.longitude
      into v_courier_lat, v_courier_lon
      from public.courier_locations l
     where l.delivery_id = v_delivery.id
     order by l.recorded_at desc
     limit 1;

    if v_courier_lat is null then
      select c.current_latitude, c.current_longitude
        into v_courier_lat, v_courier_lon
        from public.couriers c
       where c.id = v_delivery.courier_id;
    end if;
  end if;

  v_drop_lat := coalesce(v_delivery.dropoff_latitude, (
    select a.latitude from public.addresses a where a.id = v_order.address_id
  ));
  v_drop_lon := coalesce(v_delivery.dropoff_longitude, (
    select a.longitude from public.addresses a where a.id = v_order.address_id
  ));

  if v_order.status in ('delivered', 'cancelled', 'refunded', 'restaurant_rejected', 'payment_failed') then
    v.stage := 'closed';
    v.total_minutes := 0;
    v.eta_at := coalesce(v_delivery.delivered_at, v_order.updated_at);
    v.eta_min_at := v.eta_at;
    v.eta_max_at := v.eta_at;
    return v;
  end if;

  select max(h.created_at) into v_accepted_at
    from public.order_status_history h
   where h.order_id = v_order.id
     and h.to_status = 'accepted';

  if v_order.status in ('pending_payment', 'placed') then
    v.stage := 'waiting_for_restaurant';
    v.prep_minutes := coalesce(v_restaurant.avg_prep_minutes, 20);
  elsif v_order.status in ('accepted', 'preparing') then
    v.stage := 'in_the_kitchen';
    v_prep_elapsed := case
      when v_accepted_at is null then 0
      else floor(extract(epoch from (now() - v_accepted_at)) / 60)::int
    end;
    v.prep_minutes := greatest(coalesce(v_restaurant.avg_prep_minutes, 20) - v_prep_elapsed, 2);
  elsif v_order.status in ('ready_for_pickup', 'courier_assigned') then
    v.stage := 'waiting_for_courier';
    v.prep_minutes := 0;
  else
    v.stage := 'on_the_way';
    v.prep_minutes := 0;
  end if;

  if v_order.delivery_mode = 'pickup' then
    v.travel_minutes := 0;
    v.distance_km := 0;
  elsif v.stage = 'on_the_way' then
    if v_courier_lat is not null and v_drop_lat is not null then
      v.distance_km := round(
        public.haversine_km(v_courier_lat, v_courier_lon, v_drop_lat, v_drop_lon)::numeric, 2);
    else
      v.distance_km := coalesce(v_delivery.distance_km, 0);
    end if;
    v.travel_minutes := public.travel_minutes_for(v.distance_km, v_vehicle);
  else
    if v_restaurant.latitude is not null and v_drop_lat is not null then
      v.distance_km := round(
        public.haversine_km(v_restaurant.latitude, v_restaurant.longitude, v_drop_lat, v_drop_lon)::numeric,
        2);
    else
      v.distance_km := coalesce(v_delivery.distance_km, 0);
    end if;
    v.travel_minutes := public.travel_minutes_for(v.distance_km, v_vehicle);

    if v.stage = 'waiting_for_courier'
       and v_courier_lat is not null
       and v_restaurant.latitude is not null then
      v.travel_minutes := v.travel_minutes + public.travel_minutes_for(
        round(public.haversine_km(
          v_courier_lat, v_courier_lon, v_restaurant.latitude, v_restaurant.longitude)::numeric, 2),
        v_vehicle);
    end if;
  end if;

  v.total_minutes := greatest(v.prep_minutes + v.travel_minutes, 1);
  v.eta_at := now() + make_interval(mins => v.total_minutes);
  v_window := public.eta_window_minutes(v.total_minutes);
  v.eta_min_at := v.eta_at - make_interval(mins => (v_window / 2));
  v.eta_max_at := v.eta_at + make_interval(mins => (v_window / 2));

  return v;
end;
$$;

revoke all on function public.compute_delivery_eta_for(public.orders)
  from public, anon, authenticated;

create or replace function public.compute_delivery_eta(p_order_id uuid)
returns public.delivery_eta
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
begin
  select * into v_order from public.orders where id = p_order_id;

  if not found then
    return null;
  end if;

  return public.compute_delivery_eta_for(v_order);
end;
$$;

revoke all on function public.compute_delivery_eta(uuid) from public, anon, authenticated;

create or replace function public.estimate_delivery_eta(p_order_id uuid)
returns public.delivery_eta
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_role text;
begin
  v_role := public.order_actor_role(p_order_id);

  if v_role is null or v_role not in ('customer', 'restaurant', 'courier', 'admin') then
    raise exception 'You cannot read this order' using errcode = '42501';
  end if;

  return public.compute_delivery_eta(p_order_id);
end;
$$;

revoke all on function public.estimate_delivery_eta(uuid) from public, anon;
grant execute on function public.estimate_delivery_eta(uuid) to authenticated;

create or replace function public.refresh_order_eta(
  p_order_id uuid,
  p_force boolean default false
)
returns public.delivery_eta
language plpgsql
security definer
set search_path = public
as $$
declare
  v public.delivery_eta;
  v_last timestamptz;
begin
  select eta_updated_at into v_last from public.orders where id = p_order_id;

  if not found then
    return null;
  end if;

  if not p_force and v_last is not null and v_last > now() - interval '30 seconds' then
    return null;
  end if;

  v := public.compute_delivery_eta(p_order_id);

  if v.order_id is null then
    return null;
  end if;

  update public.orders
     set eta_at = v.eta_at,
         eta_min_at = v.eta_min_at,
         eta_max_at = v.eta_max_at,
         eta_updated_at = now()
   where id = p_order_id;

  update public.deliveries
     set eta_at = v.eta_at,
         eta_updated_at = now()
   where order_id = p_order_id;

  return v;
end;
$$;

revoke all on function public.refresh_order_eta(uuid, boolean) from public, anon, authenticated;

create or replace function public.orders_refresh_eta()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.refresh_order_eta(new.id, true);
  return new;
end;
$$;

create or replace function public.orders_set_eta()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare v public.delivery_eta;
begin
  v := public.compute_delivery_eta_for(new);

  if v.order_id is not null then
    new.eta_at := v.eta_at;
    new.eta_min_at := v.eta_min_at;
    new.eta_max_at := v.eta_max_at;
    new.eta_updated_at := now();
  end if;

  return new;
end;
$$;

drop trigger if exists orders_refresh_eta_on_insert on public.orders;
drop trigger if exists orders_set_eta_on_insert on public.orders;
create trigger orders_set_eta_on_insert
  before insert on public.orders
  for each row execute function public.orders_set_eta();

drop trigger if exists orders_refresh_eta_on_status on public.orders;
create trigger orders_refresh_eta_on_status
  after update of status on public.orders
  for each row
  when (old.status is distinct from new.status)
  execute function public.orders_refresh_eta();

create or replace function public.deliveries_refresh_eta()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.refresh_order_eta(new.order_id, true);
  return new;
end;
$$;

drop trigger if exists deliveries_refresh_eta on public.deliveries;
create trigger deliveries_refresh_eta
  after insert or update of status, courier_id on public.deliveries
  for each row execute function public.deliveries_refresh_eta();

create or replace function public.record_courier_location(
  p_latitude double precision,
  p_longitude double precision,
  p_accuracy_m real default null,
  p_heading real default null,
  p_speed_mps real default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_courier_id uuid := auth.uid();
  v_delivery_id uuid;
  v_order_id uuid;
begin
  if p_latitude is null or p_longitude is null
     or p_latitude < -90 or p_latitude > 90
     or p_longitude < -180 or p_longitude > 180 then
    raise exception 'Invalid coordinates' using errcode = '22023';
  end if;

  update public.couriers
     set current_latitude = p_latitude,
         current_longitude = p_longitude,
         location_updated_at = now()
   where id = v_courier_id;

  if not found then
    raise exception 'You are not registered as a courier' using errcode = '42501';
  end if;

  select id, order_id into v_delivery_id, v_order_id
    from public.deliveries
   where courier_id = v_courier_id
     and status in ('assigned', 'picked_up', 'delivering')
   order by assigned_at desc
   limit 1;

  if v_delivery_id is null then
    return null;
  end if;

  insert into public.courier_locations (
    courier_id, delivery_id, latitude, longitude, accuracy_m, heading, speed_mps
  )
  values (
    v_courier_id, v_delivery_id, p_latitude, p_longitude, p_accuracy_m, p_heading, p_speed_mps
  );

  perform public.refresh_order_eta(v_order_id, false);

  return v_delivery_id;
end;
$$;

revoke all on function public.record_courier_location(
  double precision, double precision, real, real, real) from public, anon;
grant execute on function public.record_courier_location(
  double precision, double precision, real, real, real) to authenticated;

create or replace function public.quote_delivery_estimate(
  p_restaurant_id uuid,
  p_address_id uuid default null,
  p_latitude double precision default null,
  p_longitude double precision default null
)
returns table (
  prep_minutes int,
  travel_minutes int,
  total_minutes int,
  eta_min_minutes int,
  eta_max_minutes int,
  distance_km numeric
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_restaurant public.restaurants%rowtype;
  v_lat double precision := p_latitude;
  v_lon double precision := p_longitude;
  v_distance numeric := 0;
  v_prep int;
  v_travel int;
  v_total int;
  v_window int;
begin
  select * into v_restaurant from public.restaurants where id = p_restaurant_id;

  if not found then
    raise exception 'Restaurant not found' using errcode = 'P0002';
  end if;

  if p_address_id is not null then
    select a.latitude, a.longitude into v_lat, v_lon
      from public.addresses a
     where a.id = p_address_id
       and a.user_id = auth.uid();
  end if;

  if v_lat is not null and v_lon is not null
     and v_restaurant.latitude is not null and v_restaurant.longitude is not null then
    v_distance := round(
      public.haversine_km(v_restaurant.latitude, v_restaurant.longitude, v_lat, v_lon)::numeric, 2);
  end if;

  v_prep := coalesce(v_restaurant.avg_prep_minutes, 20);
  v_travel := public.travel_minutes_for(v_distance, 'bicycle');
  v_total := greatest(v_prep + v_travel, 1);
  v_window := public.eta_window_minutes(v_total);

  return query
    select v_prep,
           v_travel,
           v_total,
           greatest(v_total - (v_window / 2), 1),
           v_total + (v_window / 2),
           v_distance;
end;
$$;

revoke all on function public.quote_delivery_estimate(uuid, uuid, double precision, double precision)
  from public;
grant execute on function public.quote_delivery_estimate(uuid, uuid, double precision, double precision)
  to anon, authenticated;

create or replace function public.quote_delivery_estimates(
  p_restaurant_ids uuid[],
  p_address_id uuid default null,
  p_latitude double precision default null,
  p_longitude double precision default null
)
returns table (
  restaurant_id uuid,
  prep_minutes int,
  travel_minutes int,
  total_minutes int,
  eta_min_minutes int,
  eta_max_minutes int,
  distance_km numeric
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_lat double precision := p_latitude;
  v_lon double precision := p_longitude;
begin
  if coalesce(array_length(p_restaurant_ids, 1), 0) = 0 then
    return;
  end if;

  if coalesce(array_length(p_restaurant_ids, 1), 0) > 100 then
    raise exception 'At most 100 restaurants at a time' using errcode = '22023';
  end if;

  if p_address_id is not null then
    select a.latitude, a.longitude into v_lat, v_lon
      from public.addresses a
     where a.id = p_address_id
       and a.user_id = auth.uid();
  end if;

  return query
    with measured as (
      select r.id,
             coalesce(r.avg_prep_minutes, 20) as prep,
             case
               when v_lat is null or v_lon is null
                 or r.latitude is null or r.longitude is null then 0::numeric
               else round(public.haversine_km(r.latitude, r.longitude, v_lat, v_lon)::numeric, 2)
             end as km
        from public.restaurants r
       where r.id = any (p_restaurant_ids)
    ),
    timed as (
      select m.id,
             m.prep,
             public.travel_minutes_for(m.km, 'bicycle') as travel,
             m.km
        from measured m
    )
    select t.id,
           t.prep,
           t.travel,
           greatest(t.prep + t.travel, 1),
           greatest(t.prep + t.travel - (public.eta_window_minutes(t.prep + t.travel) / 2), 1),
           t.prep + t.travel + (public.eta_window_minutes(t.prep + t.travel) / 2),
           t.km
      from timed t;
end;
$$;

revoke all on function public.quote_delivery_estimates(
  uuid[], uuid, double precision, double precision) from public;
grant execute on function public.quote_delivery_estimates(
  uuid[], uuid, double precision, double precision) to anon, authenticated;
