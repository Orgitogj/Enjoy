create or replace function public.promotion_has_capacity(p_promotion_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select p.max_redemptions is null
          or p.max_redemptions > (
            select count(*) from public.promotion_redemptions pr
             where pr.promotion_id = p.id and pr.state in ('reserved', 'consumed')
          )
        from public.promotions p
       where p.id = p_promotion_id
    ),
    false
  );
$$;

revoke all on function public.promotion_has_capacity(uuid) from public;
grant execute on function public.promotion_has_capacity(uuid) to anon, authenticated;

create or replace function public.active_promotions(p_restaurant_id uuid default null)
returns setof public.promotions
language sql
stable
set search_path = public
as $$
  select *
    from public.promotions
   where is_active
     and (starts_at is null or starts_at <= now())
     and (ends_at is null or ends_at > now())
     and (
       p_restaurant_id is null
       or restaurant_id is null
       or restaurant_id = p_restaurant_id
     )
     and public.promotion_has_capacity(id)
   order by coalesce(ends_at, 'infinity'::timestamptz), code;
$$;

revoke all on function public.active_promotions(uuid) from public;
grant execute on function public.active_promotions(uuid) to anon, authenticated;
