update public.restaurants
   set tags = array_replace(tags, 'Wolt+', 'ENJOY+')
 where 'Wolt+' = any(tags);

drop function if exists public.search_restaurants(text, uuid, text[], text, boolean, text, int, int);
drop function if exists public.search_restaurants_in_bounds(
  double precision, double precision, double precision, double precision, text[], text, boolean, text, int
);

create or replace function public.search_restaurants(
  p_search text default null,
  p_category_id uuid default null,
  p_cuisines text[] default null,
  p_price_tier text default null,
  p_enjoy_plus_only boolean default false,
  p_sort text default 'Recommended',
  p_limit int default 20,
  p_offset int default 0
)
returns setof public.restaurants
language sql
stable
set search_path = public
as $$
  with params as (
    select
      public.search_query(p_search) as q,
      public.search_page_size(p_limit) as lim,
      public.search_page_offset(p_offset) as off
  )
  select r.*
    from public.restaurants r, params p
   where (
           p.q is null
           or exists (
                select 1 from public.restaurant_search s
                 where s.restaurant_id = r.id and s.document @@ p.q
              )
         )
     and (p_category_id is null or exists (
           select 1 from public.restaurant_categories rc
            where rc.restaurant_id = r.id and rc.category_id = p_category_id
         ))
     and (p_cuisines is null or array_length(p_cuisines, 1) is null or r.cuisines && p_cuisines)
     and (
           p_price_tier is null
           or (p_price_tier = '€' and r.delivery_fee <= 1.5)
           or (p_price_tier = '€€' and r.delivery_fee > 1.5 and r.delivery_fee <= 2.5)
           or (p_price_tier = '€€€' and r.delivery_fee > 2.5 and r.delivery_fee <= 3.5)
           or (p_price_tier = '€€€€' and r.delivery_fee > 3.5)
         )
     and (not coalesce(p_enjoy_plus_only, false) or exists (
           select 1 from unnest(r.tags) as tag where tag ilike '%enjoy+%'
         ))
   order by
     case when p_sort = 'Delivery price' then r.delivery_fee end asc nulls last,
     case when p_sort = 'Delivery time' then r.delivery_time_min end asc nulls last,
     case when p_sort in ('Rating', 'Recommended') or p_sort is null then r.rating end desc nulls last,
     r.id
   limit (select lim from params)
  offset (select off from params);
$$;

create or replace function public.search_restaurants_in_bounds(
  p_min_lat double precision,
  p_min_lng double precision,
  p_max_lat double precision,
  p_max_lng double precision,
  p_cuisines text[] default null,
  p_price_tier text default null,
  p_enjoy_plus_only boolean default false,
  p_sort text default 'Recommended',
  p_limit int default 50
)
returns setof public.restaurants
language sql
stable
set search_path = public
as $$
  select r.*
    from public.restaurants r
   where r.latitude is not null
     and r.longitude is not null
     and r.latitude between least(p_min_lat, p_max_lat) and greatest(p_min_lat, p_max_lat)
     and r.longitude between least(p_min_lng, p_max_lng) and greatest(p_min_lng, p_max_lng)
     and (p_cuisines is null or array_length(p_cuisines, 1) is null or r.cuisines && p_cuisines)
     and (
           p_price_tier is null
           or (p_price_tier = '€' and r.delivery_fee <= 1.5)
           or (p_price_tier = '€€' and r.delivery_fee > 1.5 and r.delivery_fee <= 2.5)
           or (p_price_tier = '€€€' and r.delivery_fee > 2.5 and r.delivery_fee <= 3.5)
           or (p_price_tier = '€€€€' and r.delivery_fee > 3.5)
         )
     and (not coalesce(p_enjoy_plus_only, false) or exists (
           select 1 from unnest(r.tags) as tag where tag ilike '%enjoy+%'
         ))
   order by
     case when p_sort = 'Delivery price' then r.delivery_fee end asc nulls last,
     case when p_sort = 'Delivery time' then r.delivery_time_min end asc nulls last,
     case when p_sort in ('Rating', 'Recommended') or p_sort is null then r.rating end desc nulls last,
     r.id
   limit public.search_page_size(p_limit);
$$;

revoke all on function public.search_restaurants(text, uuid, text[], text, boolean, text, int, int) from public;
revoke all on function public.search_restaurants_in_bounds(
  double precision, double precision, double precision, double precision, text[], text, boolean, text, int
) from public;
grant execute on function public.search_restaurants(text, uuid, text[], text, boolean, text, int, int) to anon, authenticated;
grant execute on function public.search_restaurants_in_bounds(
  double precision, double precision, double precision, double precision, text[], text, boolean, text, int
) to anon, authenticated;

create or replace function public.invoke_reconcile_payments()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_url text;
  v_key text;
  v_request_id bigint;
begin
  if to_regnamespace('vault') is null then
    return 'vault is unavailable: configure the worker schedule by hand';
  end if;

  if to_regproc('net.http_post') is null then
    return 'pg_net is unavailable: configure the worker schedule by hand';
  end if;

  execute $q$
    select coalesce(
      (select decrypted_secret from vault.decrypted_secrets where name = 'enjoy_functions_url'),
      (select decrypted_secret from vault.decrypted_secrets where name = 'wolt_functions_url')
    )
  $q$ into v_url;

  execute $q$
    select coalesce(
      (select decrypted_secret from vault.decrypted_secrets where name = 'enjoy_service_role_key'),
      (select decrypted_secret from vault.decrypted_secrets where name = 'wolt_service_role_key')
    )
  $q$ into v_key;

  if v_url is null or v_key is null then
    return 'worker secrets are not configured in vault';
  end if;

  execute format(
    'select net.http_post(url => %L, headers => %L::jsonb, body => %L::jsonb)',
    rtrim(v_url, '/') || '/reconcile-payments',
    jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_key
    )::text,
    '{}'::text
  ) into v_request_id;

  return 'queued';
end;
$$;

revoke all on function public.invoke_reconcile_payments() from public, anon, authenticated;
grant execute on function public.invoke_reconcile_payments() to service_role;

do $$
declare
  v_job record;
begin
  if to_regclass('cron.job') is null then
    return;
  end if;

  for v_job in select jobid, jobname from cron.job where jobname like 'wolt-%' loop
    if exists (select 1 from cron.job where jobname = 'enjoy-' || substr(v_job.jobname, 6)) then
      perform cron.unschedule(v_job.jobid);
    else
      update cron.job set jobname = 'enjoy-' || substr(v_job.jobname, 6) where jobid = v_job.jobid;
    end if;
  end loop;
exception when insufficient_privilege then
  raise notice 'could not rename the pg_cron jobs: rename the wolt-* jobs to enjoy-* by hand';
end
$$;
