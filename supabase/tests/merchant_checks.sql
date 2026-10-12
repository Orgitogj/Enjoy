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

create or replace function pg_temp.act_as_nobody()
returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', '', true);
end;
$$;

create temporary table t_mer (key text primary key, id uuid not null) on commit drop;
grant all on t_mer to anon, authenticated;

insert into auth.users (id, email) values
  (gen_random_uuid(), 'mer-owner-a@test.local'),
  (gen_random_uuid(), 'mer-owner-b@test.local'),
  (gen_random_uuid(), 'mer-outsider@test.local'),
  (gen_random_uuid(), 'mer-admin@test.local'),
  (gen_random_uuid(), 'mer-customer@test.local');

insert into t_mer (key, id)
select 'owner_a', id from auth.users where email = 'mer-owner-a@test.local'
union all select 'owner_b', id from auth.users where email = 'mer-owner-b@test.local'
union all select 'outsider', id from auth.users where email = 'mer-outsider@test.local'
union all select 'admin', id from auth.users where email = 'mer-admin@test.local'
union all select 'customer', id from auth.users where email = 'mer-customer@test.local';

update public.profiles set role = 'admin' where id = (select id from t_mer where key = 'admin');

insert into public.restaurants (name, min_order, is_open, latitude, longitude)
values ('Merchant A', 0, true, 51.9625, 7.6257), ('Merchant B', 0, true, 51.9625, 7.6257);

insert into t_mer (key, id) select 'rest_a', id from public.restaurants where name = 'Merchant A';
insert into t_mer (key, id) select 'rest_b', id from public.restaurants where name = 'Merchant B';

insert into public.restaurant_members (restaurant_id, user_id, role)
select (select id from t_mer where key = 'rest_a'),
       (select id from t_mer where key = 'owner_a'),
       'owner';
insert into public.restaurant_members (restaurant_id, user_id, role)
select (select id from t_mer where key = 'rest_b'),
       (select id from t_mer where key = 'owner_b'),
       'owner';

insert into public.menu_categories (restaurant_id, name, subtitle)
select id, 'Mains', 'Hot food' from t_mer where key = 'rest_a';
insert into t_mer (key, id)
select 'cat_a', id from public.menu_categories
 where restaurant_id = (select id from t_mer where key = 'rest_a');

insert into public.menu_categories (restaurant_id, name)
select id, 'Mains' from t_mer where key = 'rest_b';
insert into t_mer (key, id)
select 'cat_b', id from public.menu_categories
 where restaurant_id = (select id from t_mer where key = 'rest_b');

insert into public.dishes (restaurant_id, menu_category_id, name, description, price, is_available)
select (select id from t_mer where key = 'rest_a'),
       (select id from t_mer where key = 'cat_a'),
       'Pasta', 'With basil', 12.00, true;
insert into t_mer (key, id) select 'dish_a', id from public.dishes where name = 'Pasta';

insert into public.dishes (restaurant_id, menu_category_id, name, price, is_available)
select (select id from t_mer where key = 'rest_b'),
       (select id from t_mer where key = 'cat_b'),
       'Ramen', 9.00, true;
insert into t_mer (key, id) select 'dish_b', id from public.dishes where name = 'Ramen';

insert into public.addresses (user_id, label, address_line, latitude, longitude, is_default)
select id, 'Home', 'Domplatz 1', 51.9630, 7.6260, true from t_mer where key = 'customer';
insert into t_mer (key, id)
select 'address', id from public.addresses
 where user_id = (select id from t_mer where key = 'customer');

do $$
begin
  perform pg_temp.assert(
    (select count(*) from information_schema.column_privileges
      where table_schema = 'public' and table_name = 'dishes'
        and grantee in ('anon', 'authenticated') and privilege_type = 'UPDATE') = 0,
    'authenticated holds no direct update grant on dishes');

  perform pg_temp.assert(
    (select count(*) from information_schema.column_privileges
      where table_schema = 'public' and table_name = 'restaurants'
        and grantee in ('anon', 'authenticated') and privilege_type = 'UPDATE') = 0,
    'authenticated holds no direct update grant on restaurants');

  perform pg_temp.assert(
    (select count(*) from information_schema.table_privileges
      where table_schema = 'public' and table_name = 'restaurant_hours'
        and grantee in ('anon', 'authenticated')
        and privilege_type in ('INSERT', 'UPDATE', 'DELETE')) = 0,
    'authenticated cannot write restaurant_hours directly');

  perform pg_temp.assert(
    not exists (
      select 1 from pg_policies
       where schemaname = 'public' and tablename = 'dishes' and cmd <> 'SELECT'),
    'no write policy is left on dishes');
end
$$;

do $$
declare v_dish public.dishes%rowtype;
begin
  set local role authenticated;
  perform pg_temp.act_as((select id from t_mer where key = 'owner_a'));

  v_dish := public.merchant_set_dish_available((select id from t_mer where key = 'dish_a'), false);
  perform pg_temp.assert(not v_dish.is_available, 'a member can take a dish off the menu');

  v_dish := public.merchant_set_dish_available((select id from t_mer where key = 'dish_a'), true);
  perform pg_temp.assert(v_dish.is_available, 'a member can put the dish back');
  reset role;
end
$$;

do $$
declare v_failed boolean := false;
begin
  set local role authenticated;
  perform pg_temp.act_as((select id from t_mer where key = 'outsider'));

  begin
    perform public.merchant_set_dish_available((select id from t_mer where key = 'dish_a'), false);
  exception when others then v_failed := true; end;
  perform pg_temp.assert(v_failed, 'a non member cannot change availability');

  v_failed := false;
  begin
    perform public.merchant_update_dish((select id from t_mer where key = 'dish_a'), 'Hacked');
  exception when others then v_failed := true; end;
  perform pg_temp.assert(v_failed, 'a non member cannot edit a dish');

  v_failed := false;
  begin
    perform public.merchant_set_store_paused((select id from t_mer where key = 'rest_a'), true, null);
  exception when others then v_failed := true; end;
  perform pg_temp.assert(v_failed, 'a non member cannot pause the store');

  v_failed := false;
  begin
    perform public.merchant_set_prep_time((select id from t_mer where key = 'rest_a'), 30);
  exception when others then v_failed := true; end;
  perform pg_temp.assert(v_failed, 'a non member cannot set the preparation time');

  v_failed := false;
  begin
    perform public.merchant_set_restaurant_hours(
      (select id from t_mer where key = 'rest_a'),
      '[{"day_of_week": 1, "opens_at": "09:00", "closes_at": "17:00"}]'::jsonb);
  exception when others then v_failed := true; end;
  perform pg_temp.assert(v_failed, 'a non member cannot set the opening hours');

  v_failed := false;
  begin
    perform public.merchant_menu((select id from t_mer where key = 'rest_a'));
  exception when others then v_failed := true; end;
  perform pg_temp.assert(v_failed, 'a non member cannot read the management menu');

  perform pg_temp.assert(
    (select is_available from public.dishes where id = (select id from t_mer where key = 'dish_a')),
    'the dish is untouched after the refused attempts');
  reset role;
end
$$;

do $$
declare
  v_failed boolean := false;
  v_dish public.dishes%rowtype;
begin
  set local role authenticated;
  perform pg_temp.act_as((select id from t_mer where key = 'owner_b'));

  begin
    perform public.merchant_set_dish_available((select id from t_mer where key = 'dish_a'), false);
  exception when others then v_failed := true; end;
  perform pg_temp.assert(v_failed, 'a member of one restaurant cannot edit another restaurant dish');

  v_failed := false;
  begin
    perform public.merchant_set_store_paused((select id from t_mer where key = 'rest_a'), true, null);
  exception when others then v_failed := true; end;
  perform pg_temp.assert(v_failed, 'a member of one restaurant cannot pause another store');

  v_dish := public.merchant_set_dish_available((select id from t_mer where key = 'dish_b'), false);
  perform pg_temp.assert(not v_dish.is_available,
    'the same member can still edit their own dish');
  perform public.merchant_set_dish_available((select id from t_mer where key = 'dish_b'), true);
  reset role;
end
$$;

do $$
declare v_failed boolean := false;
begin
  set local role authenticated;
  perform pg_temp.act_as_nobody();

  begin
    perform public.merchant_set_dish_available((select id from t_mer where key = 'dish_a'), false);
  exception when others then v_failed := true; end;
  perform pg_temp.assert(v_failed, 'a signed out caller cannot change availability');
  reset role;
end
$$;

do $$
declare
  v_dish public.dishes%rowtype;
  v_failed boolean := false;
begin
  set local role authenticated;
  perform pg_temp.act_as((select id from t_mer where key = 'owner_a'));

  begin
    perform public.merchant_update_dish(
      (select id from t_mer where key = 'dish_a'), null, null, 0);
  exception when others then v_failed := true; end;
  perform pg_temp.assert(v_failed, 'a price of zero is refused');

  v_failed := false;
  begin
    perform public.merchant_update_dish(
      (select id from t_mer where key = 'dish_a'), null, null, -5);
  exception when others then v_failed := true; end;
  perform pg_temp.assert(v_failed, 'a negative price is refused');

  v_failed := false;
  begin
    perform public.merchant_update_dish(
      (select id from t_mer where key = 'dish_a'), null, null, 10000);
  exception when others then v_failed := true; end;
  perform pg_temp.assert(v_failed, 'a price above the column range is refused');

  v_failed := false;
  begin
    perform public.merchant_update_dish(
      (select id from t_mer where key = 'dish_a'), repeat('x', 81));
  exception when others then v_failed := true; end;
  perform pg_temp.assert(v_failed, 'a name over 80 characters is refused');

  v_failed := false;
  begin
    perform public.merchant_update_dish(
      (select id from t_mer where key = 'dish_a'), null, repeat('x', 501));
  exception when others then v_failed := true; end;
  perform pg_temp.assert(v_failed, 'a description over 500 characters is refused');

  v_failed := false;
  begin
    perform public.merchant_update_dish(
      (select id from t_mer where key = 'dish_a'), null, null, null, null, null,
      array['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k']);
  exception when others then v_failed := true; end;
  perform pg_temp.assert(v_failed, 'more than ten dietary tags are refused');

  v_failed := false;
  begin
    perform public.merchant_update_dish(
      (select id from t_mer where key = 'dish_a'), null, null, null, null, null,
      array[repeat('x', 25)]);
  exception when others then v_failed := true; end;
  perform pg_temp.assert(v_failed, 'a dietary tag over 24 characters is refused');

  perform pg_temp.assert(
    (select price from public.dishes where id = (select id from t_mer where key = 'dish_a')) = 12.00,
    'the price is unchanged after every refused edit');

  v_dish := public.merchant_update_dish(
    (select id from t_mer where key = 'dish_a'), 'Pasta al pesto', 'Now with pine nuts', 13.5,
    null, true, array['vegetarian']);
  perform pg_temp.assert(v_dish.name = 'Pasta al pesto', 'a valid edit renames the dish');
  perform pg_temp.assert(v_dish.price = 13.50, 'a valid edit stores the rounded price');
  perform pg_temp.assert(v_dish.is_popular, 'a valid edit marks the dish popular');
  perform pg_temp.assert(v_dish.dietary_tags = array['vegetarian'], 'a valid edit stores the tags');
  perform pg_temp.assert(v_dish.description = 'Now with pine nuts',
    'a valid edit stores the description');

  v_dish := public.merchant_update_dish((select id from t_mer where key = 'dish_a'), null, null, 14);
  perform pg_temp.assert(v_dish.name = 'Pasta al pesto', 'an omitted field keeps its value');
  perform pg_temp.assert(v_dish.price = 14.00, 'the price alone can change');
  reset role;
end
$$;

do $$
declare
  v_failed boolean := false;
  v_days int;
begin
  set local role authenticated;
  perform pg_temp.act_as((select id from t_mer where key = 'owner_a'));

  perform public.merchant_set_restaurant_hours(
    (select id from t_mer where key = 'rest_a'),
    '[{"day_of_week": 1, "opens_at": "09:00", "closes_at": "17:00"},
      {"day_of_week": 2, "opens_at": "09:00", "closes_at": "17:00"}]'::jsonb);

  select count(*) into v_days from public.restaurant_hours
   where restaurant_id = (select id from t_mer where key = 'rest_a');
  perform pg_temp.assert(v_days = 2, 'the opening hours are written');

  perform public.merchant_set_restaurant_hours(
    (select id from t_mer where key = 'rest_a'),
    '[{"day_of_week": 3, "opens_at": "10:00", "closes_at": "22:00"}]'::jsonb);

  select count(*) into v_days from public.restaurant_hours
   where restaurant_id = (select id from t_mer where key = 'rest_a');
  perform pg_temp.assert(v_days = 1, 'a new week replaces the old one rather than adding to it');

  v_failed := false;
  begin
    perform public.merchant_set_restaurant_hours(
      (select id from t_mer where key = 'rest_a'),
      '[{"day_of_week": 7, "opens_at": "09:00", "closes_at": "17:00"}]'::jsonb);
  exception when others then v_failed := true; end;
  perform pg_temp.assert(v_failed, 'a day of week outside 0 to 6 is refused');

  v_failed := false;
  begin
    perform public.merchant_set_restaurant_hours(
      (select id from t_mer where key = 'rest_a'),
      '[{"day_of_week": 1, "opens_at": "09:00", "closes_at": "09:00"}]'::jsonb);
  exception when others then v_failed := true; end;
  perform pg_temp.assert(v_failed, 'a closing time equal to its opening time is refused');

  v_failed := false;
  begin
    perform public.merchant_set_restaurant_hours(
      (select id from t_mer where key = 'rest_a'),
      '[{"day_of_week": 1, "opens_at": "not a time", "closes_at": "17:00"}]'::jsonb);
  exception when others then v_failed := true; end;
  perform pg_temp.assert(v_failed, 'an unparseable time is refused');

  v_failed := false;
  begin
    perform public.merchant_set_restaurant_hours(
      (select id from t_mer where key = 'rest_a'), '{"day_of_week": 1}'::jsonb);
  exception when others then v_failed := true; end;
  perform pg_temp.assert(v_failed, 'hours that are not an array are refused');

  select count(*) into v_days from public.restaurant_hours
   where restaurant_id = (select id from t_mer where key = 'rest_a');
  perform pg_temp.assert(v_days = 1, 'a refused week leaves the stored hours alone');

  perform public.merchant_set_restaurant_hours(
    (select id from t_mer where key = 'rest_a'), '[]'::jsonb);
  select count(*) into v_days from public.restaurant_hours
   where restaurant_id = (select id from t_mer where key = 'rest_a');
  perform pg_temp.assert(v_days = 0, 'an empty week clears the hours and leaves the store always open');
  reset role;
end
$$;

do $$
declare
  v_restaurant public.restaurants%rowtype;
  v_failed boolean := false;
begin
  set local role authenticated;
  perform pg_temp.act_as((select id from t_mer where key = 'owner_a'));

  perform pg_temp.assert(
    public.is_restaurant_open((select id from t_mer where key = 'rest_a')),
    'the store is open before it is paused');

  v_restaurant := public.merchant_set_store_paused(
    (select id from t_mer where key = 'rest_a'), true, now() + interval '30 minutes');
  perform pg_temp.assert(v_restaurant.is_paused, 'pausing sets the flag');
  perform pg_temp.assert(v_restaurant.paused_until is not null, 'pausing stores when it ends');

  perform pg_temp.assert(
    not public.is_restaurant_open((select id from t_mer where key = 'rest_a')),
    'a paused store reads as closed');

  perform pg_temp.assert(
    public.is_restaurant_open(
      (select id from t_mer where key = 'rest_a'), now() + interval '2 hours'),
    'the store reads as open again once the pause has run out');

  v_restaurant := public.merchant_set_store_paused(
    (select id from t_mer where key = 'rest_a'), false, null);
  perform pg_temp.assert(not v_restaurant.is_paused, 'resuming clears the flag');
  perform pg_temp.assert(v_restaurant.paused_until is null, 'resuming clears the end time');
  perform pg_temp.assert(
    public.is_restaurant_open((select id from t_mer where key = 'rest_a')),
    'a resumed store reads as open');

  v_restaurant := public.merchant_set_store_paused(
    (select id from t_mer where key = 'rest_a'), true, null);
  perform pg_temp.assert(
    not public.is_restaurant_open(
      (select id from t_mer where key = 'rest_a'), now() + interval '30 days'),
    'a pause with no end time never runs out on its own');
  perform public.merchant_set_store_paused((select id from t_mer where key = 'rest_a'), false, null);

  v_failed := false;
  begin
    perform public.merchant_set_store_paused(
      (select id from t_mer where key = 'rest_a'), true, now() - interval '1 hour');
  exception when others then v_failed := true; end;
  perform pg_temp.assert(v_failed, 'a pause that ends in the past is refused');

  v_failed := false;
  begin
    perform public.merchant_set_store_paused(
      (select id from t_mer where key = 'rest_a'), true, now() + interval '8 days');
  exception when others then v_failed := true; end;
  perform pg_temp.assert(v_failed, 'a pause longer than a week is refused');
  reset role;
end
$$;

do $$
declare
  v_restaurant public.restaurants%rowtype;
  v_failed boolean := false;
begin
  set local role authenticated;
  perform pg_temp.act_as((select id from t_mer where key = 'owner_a'));

  v_restaurant := public.merchant_set_prep_time((select id from t_mer where key = 'rest_a'), 45);
  perform pg_temp.assert(v_restaurant.avg_prep_minutes = 45, 'the preparation time is stored');

  v_failed := false;
  begin
    perform public.merchant_set_prep_time((select id from t_mer where key = 'rest_a'), 4);
  exception when others then v_failed := true; end;
  perform pg_temp.assert(v_failed, 'a preparation time under five minutes is refused');

  v_failed := false;
  begin
    perform public.merchant_set_prep_time((select id from t_mer where key = 'rest_a'), 121);
  exception when others then v_failed := true; end;
  perform pg_temp.assert(v_failed, 'a preparation time over two hours is refused');

  v_failed := false;
  begin
    perform public.merchant_set_prep_time((select id from t_mer where key = 'rest_a'), null);
  exception when others then v_failed := true; end;
  perform pg_temp.assert(v_failed, 'a missing preparation time is refused');

  perform pg_temp.assert(
    (select avg_prep_minutes from public.restaurants
      where id = (select id from t_mer where key = 'rest_a')) = 45,
    'the stored preparation time survives the refused attempts');
  reset role;
end
$$;

do $$
declare
  v_order public.orders%rowtype;
  v_failed boolean := false;
  v_message text;
begin
  set local role authenticated;
  perform pg_temp.act_as((select id from t_mer where key = 'owner_a'));
  perform public.merchant_set_store_paused(
    (select id from t_mer where key = 'rest_a'), true, now() + interval '1 hour');

  perform pg_temp.act_as((select id from t_mer where key = 'customer'));
  begin
    v_order := public.create_order(
      (select id from t_mer where key = 'rest_a'),
      jsonb_build_array(jsonb_build_object(
        'dish_id', (select id from t_mer where key = 'dish_a'),
        'quantity', 1,
        'addon_ids', '[]'::jsonb)),
      'delivery',
      (select id from t_mer where key = 'address'),
      null, 0, 'cash', false, false, gen_random_uuid(), null);
  exception when others then
    v_failed := true;
    v_message := sqlerrm;
  end;
  perform pg_temp.assert(v_failed, 'a paused store refuses a new order');
  perform pg_temp.assert(v_message ilike '%closed%',
    format('the customer is told the restaurant is closed (got %L)', v_message));

  perform pg_temp.assert(
    not (select is_open from public.validate_cart(
      (select id from t_mer where key = 'rest_a'),
      jsonb_build_array(jsonb_build_object(
        'dish_id', (select id from t_mer where key = 'dish_a'),
        'quantity', 1,
        'addon_ids', '[]'::jsonb)))),
    'the basket check reports a paused store as closed');

  perform pg_temp.act_as((select id from t_mer where key = 'owner_a'));
  perform public.merchant_set_store_paused((select id from t_mer where key = 'rest_a'), false, null);

  perform pg_temp.act_as((select id from t_mer where key = 'customer'));
  v_order := public.create_order(
    (select id from t_mer where key = 'rest_a'),
    jsonb_build_array(jsonb_build_object(
      'dish_id', (select id from t_mer where key = 'dish_a'),
      'quantity', 1,
      'addon_ids', '[]'::jsonb)),
    'delivery',
    (select id from t_mer where key = 'address'),
    null, 0, 'cash', false, false, gen_random_uuid(), null);
  perform pg_temp.assert(v_order.id is not null, 'the same order goes through once the store resumes');
  reset role;
end
$$;

do $$
declare
  v_order public.orders%rowtype;
  v_failed boolean := false;
begin
  set local role authenticated;
  perform pg_temp.act_as((select id from t_mer where key = 'owner_a'));
  perform public.merchant_set_dish_available((select id from t_mer where key = 'dish_a'), false);

  perform pg_temp.act_as((select id from t_mer where key = 'customer'));
  begin
    v_order := public.create_order(
      (select id from t_mer where key = 'rest_a'),
      jsonb_build_array(jsonb_build_object(
        'dish_id', (select id from t_mer where key = 'dish_a'),
        'quantity', 1,
        'addon_ids', '[]'::jsonb)),
      'delivery',
      (select id from t_mer where key = 'address'),
      null, 0, 'cash', false, false, gen_random_uuid(), null);
  exception when others then v_failed := true; end;
  perform pg_temp.assert(v_failed, 'a dish taken off the menu cannot be ordered');

  perform pg_temp.act_as((select id from t_mer where key = 'owner_a'));
  perform public.merchant_set_dish_available((select id from t_mer where key = 'dish_a'), true);
  reset role;
end
$$;

do $$
declare
  v_dish public.dishes%rowtype;
  v_restaurant public.restaurants%rowtype;
begin
  set local role authenticated;
  perform pg_temp.act_as((select id from t_mer where key = 'admin'));

  v_dish := public.merchant_set_dish_available((select id from t_mer where key = 'dish_b'), false);
  perform pg_temp.assert(not v_dish.is_available, 'an administrator can edit any restaurant menu');
  perform public.merchant_set_dish_available((select id from t_mer where key = 'dish_b'), true);

  v_restaurant := public.merchant_set_prep_time((select id from t_mer where key = 'rest_b'), 25);
  perform pg_temp.assert(v_restaurant.avg_prep_minutes = 25,
    'an administrator can set any preparation time');
  reset role;
end
$$;

do $$
declare
  v_menu jsonb;
begin
  set local role authenticated;
  perform pg_temp.act_as((select id from t_mer where key = 'owner_a'));

  v_menu := public.merchant_menu((select id from t_mer where key = 'rest_a'));
  perform pg_temp.assert(jsonb_array_length(v_menu) = 1, 'the management menu lists the category');
  perform pg_temp.assert(v_menu -> 0 ->> 'name' = 'Mains', 'the category keeps its name');
  perform pg_temp.assert(
    jsonb_array_length(v_menu -> 0 -> 'dishes') = 1, 'the category carries its dishes');
  perform pg_temp.assert(
    v_menu -> 0 -> 'dishes' -> 0 ->> 'name' = 'Pasta al pesto',
    'the dish shows the edited name');
  perform pg_temp.assert(
    (v_menu -> 0 -> 'dishes' -> 0 ->> 'is_available')::boolean,
    'the management menu reports availability');
  reset role;
end
$$;

do $$
declare v_mine int;
begin
  set local role authenticated;
  perform pg_temp.act_as((select id from t_mer where key = 'owner_a'));

  select count(*) into v_mine from public.merchant_actions
   where restaurant_id = (select id from t_mer where key = 'rest_a');
  perform pg_temp.assert(v_mine > 0, 'every change is written to the audit log');

  perform pg_temp.assert(
    exists (select 1 from public.merchant_actions
             where restaurant_id = (select id from t_mer where key = 'rest_a')
               and action = 'store_paused'),
    'pausing the store is audited');
  perform pg_temp.assert(
    exists (select 1 from public.merchant_actions
             where restaurant_id = (select id from t_mer where key = 'rest_a')
               and action = 'dish_updated'
               and subject_id = (select id from t_mer where key = 'dish_a')::text),
    'editing a dish is audited against that dish');
  perform pg_temp.assert(
    (select actor_id from public.merchant_actions
      where restaurant_id = (select id from t_mer where key = 'rest_a')
        and action = 'prep_time_updated'
      order by created_at desc limit 1) = (select id from t_mer where key = 'owner_a'),
    'the audit row records who made the change');

  perform pg_temp.assert(
    (select count(*) from public.merchant_actions
      where restaurant_id = (select id from t_mer where key = 'rest_b')) = 0,
    'a merchant cannot read another restaurant audit log');
  reset role;
end
$$;

do $$
declare v_failed boolean := false;
begin
  set local role authenticated;
  perform pg_temp.act_as((select id from t_mer where key = 'owner_a'));

  begin
    insert into public.merchant_actions (restaurant_id, action, subject_type)
    values ((select id from t_mer where key = 'rest_a'), 'forged', 'restaurant');
  exception when others then v_failed := true; end;
  perform pg_temp.assert(v_failed, 'a merchant cannot forge an audit row');

  v_failed := false;
  begin
    update public.dishes set price = 1
     where id = (select id from t_mer where key = 'dish_a');
  exception when others then v_failed := true; end;
  perform pg_temp.assert(v_failed, 'a merchant cannot change a price without the RPC');

  v_failed := false;
  begin
    update public.restaurants set is_paused = true
     where id = (select id from t_mer where key = 'rest_a');
  exception when others then v_failed := true; end;
  perform pg_temp.assert(v_failed, 'a merchant cannot pause the store without the RPC');

  v_failed := false;
  begin
    insert into public.restaurant_hours (restaurant_id, day_of_week, opens_at, closes_at)
    values ((select id from t_mer where key = 'rest_a'), 1, '00:00', '23:59');
  exception when others then v_failed := true; end;
  perform pg_temp.assert(v_failed, 'a merchant cannot write opening hours without the RPC');
  reset role;
end
$$;

rollback;
