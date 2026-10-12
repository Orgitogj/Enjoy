\set ON_ERROR_STOP on

begin;

create or replace function pg_temp.assert(p_condition boolean, p_label text)
returns void language plpgsql as $$
begin
  if not p_condition then
    raise exception 'FAIL: %', p_label;
  end if;
  raise notice 'pass: %', p_label;
end;
$$;

create or replace function pg_temp.act_as(p_user_id uuid)
returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', p_user_id, 'role', 'authenticated', 'is_anonymous', false)::text, true);
end;
$$;

create temporary table t_eta (key text primary key, id uuid not null) on commit drop;
grant all on t_eta to anon, authenticated;

insert into auth.users (id, email) values
  (gen_random_uuid(), 'eta-customer@test.local'),
  (gen_random_uuid(), 'eta-merchant@test.local'),
  (gen_random_uuid(), 'eta-courier@test.local'),
  (gen_random_uuid(), 'eta-stranger@test.local'),
  (gen_random_uuid(), 'eta-admin@test.local');

insert into t_eta (key, id)
select 'customer', id from auth.users where email = 'eta-customer@test.local'
union all select 'merchant', id from auth.users where email = 'eta-merchant@test.local'
union all select 'courier', id from auth.users where email = 'eta-courier@test.local'
union all select 'stranger', id from auth.users where email = 'eta-stranger@test.local'
union all select 'admin', id from auth.users where email = 'eta-admin@test.local';

update public.profiles set role = 'admin' where id = (select id from t_eta where key = 'admin');

insert into public.restaurants (name, min_order, is_open, latitude, longitude, avg_prep_minutes)
values ('ETA Kitchen', 0, true, 51.9625, 7.6257, 30);
insert into t_eta (key, id) select 'restaurant', id from public.restaurants where name = 'ETA Kitchen';

insert into public.menu_categories (restaurant_id, name)
select id, 'Mains' from t_eta where key = 'restaurant';

insert into public.dishes (restaurant_id, menu_category_id, name, price, is_available)
select r.id, m.id, 'ETA Dish', 10.00, true
  from t_eta r join public.menu_categories m on m.restaurant_id = r.id
 where r.key = 'restaurant';
insert into t_eta (key, id) select 'dish', id from public.dishes where name = 'ETA Dish';

insert into public.addresses (user_id, label, address_line, latitude, longitude)
select id, 'Home', 'Etaweg 1', 51.9725, 7.6257 from t_eta where key = 'customer';
insert into t_eta (key, id) select 'address', id from public.addresses where address_line = 'Etaweg 1';

insert into public.restaurant_members (restaurant_id, user_id, role)
select r.id, u.id, 'owner' from t_eta r, t_eta u where r.key = 'restaurant' and u.key = 'merchant';

insert into public.couriers (id, full_name, vehicle_type, availability, verification_status,
                            current_latitude, current_longitude, location_updated_at)
select id, 'ETA Courier', 'bicycle', 'online', 'approved', 51.9625, 7.6257, now()
  from t_eta where key = 'courier';

do $$
begin
  perform pg_temp.assert(public.vehicle_speed_kmh('on_foot') = 5, 'walking is the slowest vehicle');
  perform pg_temp.assert(public.vehicle_speed_kmh('bicycle') = 15, 'a bicycle rides at 15 km/h');
  perform pg_temp.assert(public.vehicle_speed_kmh('scooter') = 25, 'a scooter rides at 25 km/h');
  perform pg_temp.assert(public.vehicle_speed_kmh('car') = 30, 'a car drives at 30 km/h');
  perform pg_temp.assert(public.vehicle_speed_kmh(null) = 15,
    'an unknown vehicle is treated as a bicycle');

  perform pg_temp.assert(public.travel_minutes_for(0, 'bicycle') = 0,
    'no distance takes no time');
  perform pg_temp.assert(public.travel_minutes_for(null, 'bicycle') = 0,
    'an unknown distance takes no time');
  perform pg_temp.assert(public.travel_minutes_for(15, 'bicycle') = 60,
    'a bicycle needs an hour for 15 km');
  perform pg_temp.assert(public.travel_minutes_for(15, 'car') = 30,
    'a car needs half an hour for the same 15 km');
  perform pg_temp.assert(public.travel_minutes_for(0.01, 'bicycle') = 1,
    'any distance at all takes at least a minute');

  perform pg_temp.assert(public.eta_window_minutes(5) = 10, 'a short ride still gets a ten minute window');
  perform pg_temp.assert(public.eta_window_minutes(100) = 30, 'a long ride gets a wider window');
end
$$;

do $$
declare v_order public.orders%rowtype;
begin
  perform pg_temp.act_as((select id from t_eta where key = 'customer'));
  v_order := public.create_order(
    (select id from t_eta where key = 'restaurant'),
    jsonb_build_array(jsonb_build_object(
      'dish_id', (select id from t_eta where key = 'dish'),
      'quantity', 1,
      'addon_ids', '[]'::jsonb)),
    'delivery',
    (select id from t_eta where key = 'address'),
    null, 0, 'cash', false, false, gen_random_uuid(), null);
  insert into t_eta (key, id) values ('order', v_order.id);

  perform pg_temp.assert(v_order.eta_at is not null,
    'the row create_order hands back already carries the estimate');
  perform pg_temp.assert(v_order.eta_min_at < v_order.eta_max_at,
    'the row create_order hands back carries the window');
end
$$;

do $$
declare
  v public.delivery_eta;
  v_order public.orders%rowtype;
  v_expected_travel int;
begin
  v := public.compute_delivery_eta((select id from t_eta where key = 'order'));

  perform pg_temp.assert(v.stage = 'waiting_for_restaurant',
    'a placed order is waiting for the restaurant');
  perform pg_temp.assert(v.prep_minutes = 30, 'the whole preparation time is still ahead');
  perform pg_temp.assert(v.distance_km > 1 and v.distance_km < 1.5,
    'the distance is measured from the restaurant to the address');

  v_expected_travel := public.travel_minutes_for(v.distance_km, 'bicycle');
  perform pg_temp.assert(v.travel_minutes = v_expected_travel,
    'the travel time comes from the distance and the vehicle');
  perform pg_temp.assert(v.total_minutes = v.prep_minutes + v.travel_minutes,
    'the total is the preparation time plus the travel time');

  perform pg_temp.assert(v.eta_at > now(), 'the estimate is in the future');
  perform pg_temp.assert(v.eta_min_at < v.eta_at, 'the window opens before the estimate');
  perform pg_temp.assert(v.eta_max_at > v.eta_at, 'the window closes after the estimate');
  perform pg_temp.assert(
    extract(epoch from (v.eta_max_at - v.eta_min_at)) >= 600,
    'the window is at least ten minutes wide');

  select * into v_order from public.orders where id = (select id from t_eta where key = 'order');
  perform pg_temp.assert(v_order.eta_at is not null, 'the estimate is stored on the order');
  perform pg_temp.assert(v_order.eta_min_at is not null, 'the window is stored on the order');
  perform pg_temp.assert(v_order.eta_updated_at is not null, 'the order records when it was last worked out');
end
$$;

do $$
declare
  v public.delivery_eta;
  v_stored timestamptz;
begin
  update public.orders
     set eta_at = now() + interval '99 hours',
         eta_min_at = now() + interval '99 hours',
         eta_max_at = now() + interval '99 hours'
   where id = (select id from t_eta where key = 'order');

  perform pg_temp.act_as((select id from t_eta where key = 'merchant'));
  set local role authenticated;
  perform public.transition_order_status(
    (select id from t_eta where key = 'order'), 'accepted'::public.order_status);
  reset role;

  v := public.compute_delivery_eta((select id from t_eta where key = 'order'));
  perform pg_temp.assert(v.stage = 'in_the_kitchen', 'an accepted order is in the kitchen');
  perform pg_temp.assert(v.prep_minutes = 30,
    'the preparation time is still whole the moment it is accepted');

  select eta_at into v_stored from public.orders
   where id = (select id from t_eta where key = 'order');
  perform pg_temp.assert(v_stored = v.eta_at,
    'a status change rewrites the stored estimate with the current one');
  perform pg_temp.assert(v_stored < now() + interval '2 hours',
    'the stale estimate was thrown away');
end
$$;

do $$
declare v public.delivery_eta;
begin
  update public.order_status_history
     set created_at = now() - interval '20 minutes'
   where order_id = (select id from t_eta where key = 'order')
     and to_status = 'accepted';

  v := public.compute_delivery_eta((select id from t_eta where key = 'order'));
  perform pg_temp.assert(v.prep_minutes = 10,
    'twenty minutes into a thirty minute prep leaves ten minutes');

  update public.order_status_history
     set created_at = now() - interval '3 hours'
   where order_id = (select id from t_eta where key = 'order')
     and to_status = 'accepted';

  v := public.compute_delivery_eta((select id from t_eta where key = 'order'));
  perform pg_temp.assert(v.prep_minutes = 2,
    'a kitchen that is running late never promises less than two minutes');

  update public.order_status_history
     set created_at = now()
   where order_id = (select id from t_eta where key = 'order')
     and to_status = 'accepted';
end
$$;

do $$
declare v public.delivery_eta;
begin
  perform pg_temp.act_as((select id from t_eta where key = 'merchant'));
  set local role authenticated;
  perform public.transition_order_status(
    (select id from t_eta where key = 'order'), 'preparing'::public.order_status);
  reset role;

  v := public.compute_delivery_eta((select id from t_eta where key = 'order'));
  perform pg_temp.assert(v.stage = 'in_the_kitchen', 'a preparing order is still in the kitchen');
  perform pg_temp.assert(v.prep_minutes > 0, 'there is preparation time left while preparing');
end
$$;

do $$
declare
  v public.delivery_eta;
  v_delivery public.deliveries%rowtype;
begin
  perform pg_temp.act_as((select id from t_eta where key = 'merchant'));
  set local role authenticated;
  perform public.transition_order_status(
    (select id from t_eta where key = 'order'), 'ready_for_pickup'::public.order_status);
  reset role;

  select * into v_delivery from public.deliveries
   where order_id = (select id from t_eta where key = 'order');
  perform pg_temp.assert(v_delivery.id is not null, 'the dispatch trigger created the delivery');
  insert into t_eta (key, id) values ('delivery', v_delivery.id);

  v := public.compute_delivery_eta((select id from t_eta where key = 'order'));
  perform pg_temp.assert(v.stage = 'waiting_for_courier', 'a ready order waits for a courier');
  perform pg_temp.assert(v.prep_minutes = 0, 'the kitchen is done once the order is ready');
  perform pg_temp.assert(v.travel_minutes > 0, 'there is still a ride to the customer');

  perform pg_temp.assert(v_delivery.eta_at is not null, 'the delivery carries the estimate too');
end
$$;

do $$
declare
  v_without int;
  v_with int;
begin
  v_without := (public.compute_delivery_eta((select id from t_eta where key = 'order'))).travel_minutes;

  update public.deliveries
     set courier_id = (select id from t_eta where key = 'courier'),
         status = 'assigned',
         assigned_at = now()
   where order_id = (select id from t_eta where key = 'order');

  update public.couriers
     set current_latitude = 51.9500, current_longitude = 7.6257
   where id = (select id from t_eta where key = 'courier');

  v_with := (public.compute_delivery_eta((select id from t_eta where key = 'order'))).travel_minutes;

  perform pg_temp.assert(v_with > v_without,
    'a courier who is still far from the restaurant adds to the wait');
end
$$;

do $$
declare v public.delivery_eta;
begin
  perform pg_temp.act_as((select id from t_eta where key = 'admin'));
  set local role authenticated;
  perform public.transition_order_status(
    (select id from t_eta where key = 'order'), 'courier_assigned'::public.order_status);
  reset role;

  v := public.compute_delivery_eta((select id from t_eta where key = 'order'));
  perform pg_temp.assert(v.stage = 'waiting_for_courier',
    'an order with a courier on the way to the kitchen is still waiting for pickup');
  perform pg_temp.assert(v.prep_minutes = 0, 'the kitchen is done by then');
end
$$;

do $$
declare
  v public.delivery_eta;
  v_direct numeric;
begin
  update public.deliveries
     set status = 'picked_up', picked_up_at = now()
   where order_id = (select id from t_eta where key = 'order');

  perform pg_temp.act_as((select id from t_eta where key = 'courier'));
  set local role authenticated;
  perform public.transition_order_status(
    (select id from t_eta where key = 'order'), 'picked_up'::public.order_status);
  reset role;

  insert into public.courier_locations (courier_id, delivery_id, latitude, longitude)
  select (select id from t_eta where key = 'courier'),
         (select id from t_eta where key = 'delivery'),
         51.9690, 7.6257;

  v := public.compute_delivery_eta((select id from t_eta where key = 'order'));
  perform pg_temp.assert(v.stage = 'on_the_way', 'a picked up order is on the way');
  perform pg_temp.assert(v.prep_minutes = 0, 'nothing is left in the kitchen');

  v_direct := round(public.haversine_km(51.9690, 7.6257, 51.9725, 7.6257)::numeric, 2);
  perform pg_temp.assert(v.distance_km = v_direct,
    'the remaining distance is measured from the courier to the customer');
  perform pg_temp.assert(v.travel_minutes = public.travel_minutes_for(v_direct, 'bicycle'),
    'the remaining ride uses the courier own vehicle');
end
$$;

do $$
declare
  v_bicycle int;
  v_car int;
begin
  v_bicycle := (public.compute_delivery_eta((select id from t_eta where key = 'order'))).travel_minutes;

  update public.couriers set vehicle_type = 'car'
   where id = (select id from t_eta where key = 'courier');

  v_car := (public.compute_delivery_eta((select id from t_eta where key = 'order'))).travel_minutes;
  perform pg_temp.assert(v_car <= v_bicycle, 'a car is never slower than a bicycle');

  update public.couriers set vehicle_type = 'bicycle'
   where id = (select id from t_eta where key = 'courier');
end
$$;

do $$
declare
  v_stale timestamptz := now() + interval '99 hours';
  v_after timestamptz;
begin
  update public.orders
     set eta_at = v_stale,
         eta_updated_at = now() - interval '5 minutes'
   where id = (select id from t_eta where key = 'order');

  perform pg_temp.act_as((select id from t_eta where key = 'courier'));
  set local role authenticated;
  perform public.record_courier_location(51.9700, 7.6257);
  reset role;

  select eta_at into v_after from public.orders
   where id = (select id from t_eta where key = 'order');
  perform pg_temp.assert(v_after <> v_stale, 'a courier position refreshes the estimate');

  update public.orders set eta_at = v_stale
   where id = (select id from t_eta where key = 'order');

  perform pg_temp.act_as((select id from t_eta where key = 'courier'));
  set local role authenticated;
  perform public.record_courier_location(51.9710, 7.6257);
  reset role;

  select eta_at into v_after from public.orders
   where id = (select id from t_eta where key = 'order');
  perform pg_temp.assert(v_after = v_stale,
    'a second position within thirty seconds does not recompute');

  perform pg_temp.assert(
    (public.refresh_order_eta((select id from t_eta where key = 'order'), true)).order_id is not null,
    'a forced refresh returns the estimate');

  select eta_at into v_after from public.orders
   where id = (select id from t_eta where key = 'order');
  perform pg_temp.assert(v_after <> v_stale, 'a forced refresh ignores the throttle');

  perform pg_temp.assert(
    (select count(*) from public.courier_locations
      where delivery_id = (select id from t_eta where key = 'delivery')) >= 2,
    'every position is still recorded even when the estimate is not recomputed');
end
$$;

do $$
declare
  v public.delivery_eta;
  v_role text;
begin
  perform pg_temp.act_as((select id from t_eta where key = 'customer'));
  set local role authenticated;
  v := public.estimate_delivery_eta((select id from t_eta where key = 'order'));
  perform pg_temp.assert(v.eta_at is not null, 'the customer can read the estimate');
  reset role;

  perform pg_temp.act_as((select id from t_eta where key = 'merchant'));
  set local role authenticated;
  v := public.estimate_delivery_eta((select id from t_eta where key = 'order'));
  perform pg_temp.assert(v.eta_at is not null, 'the restaurant can read the estimate');
  reset role;

  perform pg_temp.act_as((select id from t_eta where key = 'courier'));
  set local role authenticated;
  v := public.estimate_delivery_eta((select id from t_eta where key = 'order'));
  perform pg_temp.assert(v.eta_at is not null, 'the courier can read the estimate');
  reset role;
end
$$;

do $$
declare v_failed boolean := false;
begin
  perform pg_temp.act_as((select id from t_eta where key = 'stranger'));
  set local role authenticated;

  begin
    perform public.estimate_delivery_eta((select id from t_eta where key = 'order'));
  exception when others then v_failed := true; end;
  perform pg_temp.assert(v_failed, 'nobody else can read the estimate');

  perform pg_temp.assert(
    (select count(*) from public.orders where id = (select id from t_eta where key = 'order')) = 0,
    'nobody else can read the stored estimate off the order either');
  reset role;
end
$$;

do $$
declare v_failed boolean := false;
begin
  set local role anon;

  begin
    perform public.estimate_delivery_eta((select id from t_eta where key = 'order'));
  exception when others then v_failed := true; end;
  perform pg_temp.assert(v_failed, 'a signed out caller cannot read the estimate');
  reset role;
end
$$;

do $$
declare v_failed boolean := false;
begin
  perform pg_temp.act_as((select id from t_eta where key = 'customer'));
  set local role authenticated;

  begin
    perform public.refresh_order_eta((select id from t_eta where key = 'order'), true);
  exception when others then v_failed := true; end;
  perform pg_temp.assert(v_failed, 'a client cannot force a refresh');

  v_failed := false;
  begin
    update public.orders set eta_at = now()
     where id = (select id from t_eta where key = 'order');
  exception when others then v_failed := true; end;
  perform pg_temp.assert(v_failed, 'a client cannot write an estimate by hand');
  reset role;
end
$$;

do $$
declare v public.delivery_eta;
begin
  perform pg_temp.act_as((select id from t_eta where key = 'courier'));
  set local role authenticated;
  perform public.transition_order_status(
    (select id from t_eta where key = 'order'), 'delivering'::public.order_status);
  perform public.transition_order_status(
    (select id from t_eta where key = 'order'), 'delivered'::public.order_status);
  reset role;

  update public.deliveries
     set status = 'delivered', delivered_at = now()
   where order_id = (select id from t_eta where key = 'order');

  v := public.compute_delivery_eta((select id from t_eta where key = 'order'));
  perform pg_temp.assert(v.stage = 'closed', 'a delivered order is closed');
  perform pg_temp.assert(v.total_minutes = 0, 'a closed order has nothing left to wait for');
  perform pg_temp.assert(v.eta_at is not null, 'a closed order reports when it arrived');
end
$$;

do $$
declare
  v_order public.orders%rowtype;
  v public.delivery_eta;
begin
  perform pg_temp.act_as((select id from t_eta where key = 'customer'));
  set local role authenticated;
  v_order := public.create_order(
    (select id from t_eta where key = 'restaurant'),
    jsonb_build_array(jsonb_build_object(
      'dish_id', (select id from t_eta where key = 'dish'),
      'quantity', 1,
      'addon_ids', '[]'::jsonb)),
    'pickup',
    null,
    null, 0, 'cash', false, false, gen_random_uuid(), null);
  reset role;

  v := public.compute_delivery_eta(v_order.id);
  perform pg_temp.assert(v.travel_minutes = 0, 'a pickup order has no ride');
  perform pg_temp.assert(v.distance_km = 0, 'a pickup order has no distance');
  perform pg_temp.assert(v.total_minutes = v.prep_minutes,
    'a pickup order is ready when the kitchen is done');
end
$$;

do $$
declare
  v_prep int;
  v_travel int;
  v_total int;
  v_min int;
  v_max int;
  v_distance numeric;
begin
  perform pg_temp.act_as((select id from t_eta where key = 'customer'));
  set local role authenticated;

  select prep_minutes, travel_minutes, total_minutes, eta_min_minutes, eta_max_minutes, distance_km
    into v_prep, v_travel, v_total, v_min, v_max, v_distance
    from public.quote_delivery_estimate(
      (select id from t_eta where key = 'restaurant'),
      (select id from t_eta where key = 'address'));

  perform pg_temp.assert(v_prep = 30, 'the quote uses the kitchen preparation time');
  perform pg_temp.assert(v_distance > 1 and v_distance < 1.5, 'the quote measures the distance');
  perform pg_temp.assert(v_travel > 0, 'the quote adds the ride');
  perform pg_temp.assert(v_total = v_prep + v_travel, 'the quote totals both');
  perform pg_temp.assert(v_min < v_total and v_max > v_total, 'the quote gives a range');

  select total_minutes, distance_km into v_total, v_distance
    from public.quote_delivery_estimate((select id from t_eta where key = 'restaurant'));
  perform pg_temp.assert(v_distance = 0, 'with no address the quote has no distance');
  perform pg_temp.assert(v_total = 30, 'with no address the quote is the preparation time');

  select distance_km into v_distance
    from public.quote_delivery_estimate(
      (select id from t_eta where key = 'restaurant'),
      null, 51.9725, 7.6257);
  perform pg_temp.assert(v_distance > 1, 'the quote accepts bare coordinates');
  reset role;
end
$$;

do $$
declare v_distance numeric;
begin
  perform pg_temp.act_as((select id from t_eta where key = 'stranger'));
  set local role authenticated;

  select distance_km into v_distance
    from public.quote_delivery_estimate(
      (select id from t_eta where key = 'restaurant'),
      (select id from t_eta where key = 'address'));
  perform pg_temp.assert(v_distance = 0,
    'another customer address id tells you nothing about where they live');
  reset role;
end
$$;

rollback;
