begin;

create sequence if not exists public.order_number_seq;
revoke all on sequence public.order_number_seq from public, anon, authenticated;
grant usage, select on sequence public.order_number_seq to service_role;

create or replace function public.consume_rate_limit(p_key text, p_limit integer, p_window_seconds integer)
returns boolean language plpgsql security definer set search_path = '' as $$
declare hit_count integer;
begin
  if p_limit < 1 or p_window_seconds < 1 or length(p_key) > 200 then return false; end if;
  insert into public.rate_limits(key, window_start, count, updated_at)
  values (p_key, now(), 1, now())
  on conflict (key) do update set
    count = case when public.rate_limits.window_start < now() - make_interval(secs => p_window_seconds) then 1 else public.rate_limits.count + 1 end,
    window_start = case when public.rate_limits.window_start < now() - make_interval(secs => p_window_seconds) then now() else public.rate_limits.window_start end,
    updated_at = now();
  select count into hit_count from public.rate_limits where key = p_key;
  return hit_count <= p_limit;
end;
$$;

create or replace function public.create_order(
  p_customer_name text,
  p_phone_e164 text,
  p_customer_note text,
  p_currency_code text,
  p_items jsonb,
  p_coupon_code text default null,
  p_payment_method_id uuid default null,
  p_user_id uuid default null
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  request_item record;
  product_row public.products%rowtype;
  coupon_row public.coupons%rowtype;
  customer_row public.customers%rowtype;
  user_banned boolean := false;
  settings_row public.store_settings%rowtype;
  v_order_id uuid;
  v_order_number text;
  v_currency_code text := upper(p_currency_code);
  item_count integer := 0;
  subtotal bigint := 0;
  eligible_coupon_subtotal bigint := 0;
  tier_discount bigint := 0;
  coupon_discount bigint := 0;
  applied_coupon_discount bigint := 0;
  total_discount bigint := 0;
  tax_total bigint := 0;
  total_due bigint := 0;
  coupon_valid jsonb;
  coupon_applies boolean := false;
  stock_id uuid;
  stock_ids uuid[];
  available_count integer;
  unit_price bigint;
  tier_row record;
  coupon_usage integer;
begin
  if length(btrim(p_customer_name)) not between 1 and 120 or p_phone_e164 !~ '^\+[1-9][0-9]{6,14}$' then
    raise exception 'invalid_order' using errcode = '22023';
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 or jsonb_array_length(p_items) > 50 then
    raise exception 'invalid_order_items' using errcode = '22023';
  end if;
  if exists (
    select 1 from (
      select (item ->> 'product_id')::uuid as product_id,
             sum((item ->> 'quantity')::integer)::integer as quantity
      from jsonb_array_elements(p_items) item
      group by (item ->> 'product_id')::uuid
    ) requested
    where requested.quantity not between 1 and 20
  ) then raise exception 'invalid_quantity' using errcode = '22023'; end if;
  if p_user_id is not null then
    select coalesce(pr.is_banned, false) into user_banned from public.profiles pr where pr.user_id = p_user_id;
    if user_banned then raise exception 'order_not_available' using errcode = '42501'; end if;
  end if;
  select * into settings_row from public.store_settings where id = 1;
  if settings_row.require_login_to_order and p_user_id is null then raise exception 'sign_in_required' using errcode = '42501'; end if;
  if not exists (select 1 from public.currencies c where c.code = v_currency_code and c.is_active) then
    raise exception 'currency_unavailable' using errcode = '22023';
  end if;
  if p_payment_method_id is not null and not exists (select 1 from public.payment_methods pm where pm.id = p_payment_method_id and pm.is_active) then
    raise exception 'payment_method_unavailable' using errcode = '22023';
  end if;

  for request_item in
    select (item ->> 'product_id')::uuid as product_id,
           (item ->> 'quantity')::integer as quantity
    from jsonb_array_elements(p_items) item
  loop
    if request_item.quantity not between 1 and 20 then raise exception 'invalid_quantity' using errcode = '22023'; end if;
    select * into product_row from public.products p
      where p.id = request_item.product_id and p.is_active and p.deleted_at is null
        and (p.visible_from is null or p.visible_from <= now())
      for share;
    if not found then raise exception 'item_unavailable' using errcode = '22023'; end if;
    if not exists (select 1 from public.product_prices pp where pp.product_id = product_row.id and pp.currency_code = v_currency_code for share) then
      raise exception 'price_unavailable' using errcode = '22023';
    end if;
    select pp.price_minor into unit_price from public.product_prices pp
      where pp.product_id = product_row.id and pp.currency_code = v_currency_code for share;
    subtotal := subtotal + unit_price * request_item.quantity;
    item_count := item_count + request_item.quantity;
    if p_coupon_code is null or exists (
      select 1 from public.coupons c
      where c.code = upper(btrim(p_coupon_code)) and c.scope = 'all_products'
    ) or exists (
      select 1 from public.coupons c join public.coupon_categories cc on cc.coupon_id = c.id
      where c.code = upper(btrim(p_coupon_code)) and cc.category_id = product_row.category_id
    ) then
      eligible_coupon_subtotal := eligible_coupon_subtotal + unit_price * request_item.quantity;
    end if;
    if product_row.stock_mode = 'manual' and product_row.manual_stock < request_item.quantity then
      raise exception 'item_out_of_stock' using errcode = '22023';
    end if;
    if product_row.stock_mode = 'tracked' then
      select count(*)::integer into available_count from public.stock_items si
       where si.product_id = product_row.id and si.status = 'available';
      if available_count < request_item.quantity then raise exception 'item_out_of_stock' using errcode = '22023'; end if;
    end if;
  end loop;
  if subtotal <= 0 then raise exception 'invalid_order_total' using errcode = '22023'; end if;

  select bt.* into tier_row from public.bundle_tiers bt
    where bt.is_active and bt.min_items <= item_count order by bt.min_items desc limit 1;
  if found then
    if tier_row.discount_type = 'percent' then
      tier_discount := floor(subtotal * tier_row.discount_value / 100.0)::bigint;
    elsif v_currency_code = settings_row.default_currency then
      tier_discount := least(subtotal, tier_row.discount_value::bigint);
    end if;
  end if;

  if p_coupon_code is not null then
    select * into coupon_row from public.coupons c where c.code = upper(btrim(p_coupon_code)) for update;
    if not found or not coupon_row.is_active
       or (coupon_row.starts_at is not null and coupon_row.starts_at > now())
       or (coupon_row.ends_at is not null and coupon_row.ends_at <= now())
       or (coupon_row.usage_limit_total is not null and coupon_row.usage_count >= coupon_row.usage_limit_total)
       or (coupon_row.scope = 'specific_categories' and eligible_coupon_subtotal = 0)
       or (coupon_row.min_order_amount_minor is not null and v_currency_code <> settings_row.default_currency)
       or (coupon_row.min_order_amount_minor is not null and subtotal < coupon_row.min_order_amount_minor) then
      raise exception 'coupon_unavailable' using errcode = '22023';
    end if;
    if coupon_row.usage_limit_per_customer is not null then
      select count(*)::integer into coupon_usage from public.coupon_redemptions cr
      where cr.coupon_id = coupon_row.id and (
        (p_user_id is not null and cr.user_id = p_user_id)
        or exists (select 1 from public.customers c where c.phone_e164 = p_phone_e164 and cr.customer_id = c.id)
      );
      if coupon_usage >= coupon_row.usage_limit_per_customer then raise exception 'coupon_unavailable' using errcode = '22023'; end if;
    end if;
    if coupon_row.scope = 'all_products' then eligible_coupon_subtotal := subtotal; end if;
    if settings_row.discount_stacking_mode = 'stack' then
      coupon_discount := floor(greatest(eligible_coupon_subtotal - floor(eligible_coupon_subtotal * tier_discount / greatest(subtotal, 1)), 0) * coupon_row.percent_off / 100.0)::bigint;
      applied_coupon_discount := coupon_discount;
    else
      coupon_discount := floor(eligible_coupon_subtotal * coupon_row.percent_off / 100.0)::bigint;
      if coupon_discount > tier_discount then applied_coupon_discount := coupon_discount; end if;
    end if;
    coupon_applies := applied_coupon_discount > 0;
  end if;
  if settings_row.discount_stacking_mode = 'stack' then
    total_discount := least(subtotal, tier_discount + applied_coupon_discount);
  else
    total_discount := greatest(tier_discount, applied_coupon_discount);
  end if;
  total_due := greatest(subtotal - total_discount + tax_total, 0);

  insert into public.customers(phone_e164, user_id, name, total_orders, first_order_at, last_order_at)
  values (p_phone_e164, p_user_id, btrim(p_customer_name), 0, now(), now())
  on conflict (phone_e164) do update set
    user_id = coalesce(public.customers.user_id, excluded.user_id),
    name = excluded.name,
    last_order_at = now(), updated_at = now()
  returning * into customer_row;
  if customer_row.is_blocked then raise exception 'order_not_available' using errcode = '42501'; end if;

  v_order_number := settings_row.order_number_prefix || '-' || to_char(now(), 'YYMMDD') || '-' || lpad(nextval('public.order_number_seq')::text, 4, '0');
  insert into public.orders(order_number, customer_id, user_id, customer_name, phone_e164,
      customer_note, currency_code, subtotal_minor, coupon_code_used, coupon_discount_minor,
      tier_discount_minor, discount_minor, tax_minor, total_minor, payment_method_id)
  values (v_order_number, customer_row.id, p_user_id, btrim(p_customer_name), p_phone_e164,
      nullif(btrim(p_customer_note), ''), v_currency_code, subtotal,
      case when coupon_applies then coupon_row.code else null end, applied_coupon_discount,
      case when settings_row.discount_stacking_mode = 'stack' or tier_discount >= applied_coupon_discount then tier_discount else 0 end,
      total_discount, tax_total, total_due, p_payment_method_id)
  returning id into v_order_id;

  for request_item in
    select (item ->> 'product_id')::uuid as product_id,
           sum((item ->> 'quantity')::integer)::integer as quantity
    from jsonb_array_elements(p_items) item group by (item ->> 'product_id')::uuid
  loop
    select * into product_row from public.products p where p.id = request_item.product_id for update;
    if product_row.stock_mode = 'manual' then
      update public.products set manual_stock = manual_stock - request_item.quantity where id = product_row.id;
      insert into public.order_items(order_id, product_id, product_name_ar_snapshot, product_name_en_snapshot,
        unit_price_minor, quantity, tax_minor)
      select v_order_id, p.id, p.name_ar, p.name_en, pp.price_minor, request_item.quantity, 0
      from public.products p join public.product_prices pp on pp.product_id = p.id and pp.currency_code = v_currency_code
      where p.id = product_row.id;
    elsif product_row.stock_mode = 'tracked' then
      select array_agg(picked.id) into stock_ids from (
        select si.id from public.stock_items si where si.product_id = product_row.id and si.status = 'available'
        order by si.created_at limit request_item.quantity for update skip locked
      ) picked;
      if coalesce(array_length(stock_ids, 1), 0) <> request_item.quantity then raise exception 'item_out_of_stock' using errcode = '22023'; end if;
      update public.stock_items set status = 'reserved', reserved_order_id = v_order_id,
        reserved_until = now() + make_interval(mins => settings_row.stock_reservation_minutes)
      where id = any(stock_ids);
      foreach stock_id in array stock_ids loop
        insert into public.order_items(order_id, product_id, product_name_ar_snapshot, product_name_en_snapshot,
          unit_price_minor, quantity, tax_minor, stock_item_id)
        select v_order_id, p.id, p.name_ar, p.name_en, pp.price_minor, 1, 0, stock_id
        from public.products p join public.product_prices pp on pp.product_id = p.id and pp.currency_code = v_currency_code
        where p.id = product_row.id;
      end loop;
    else
      insert into public.order_items(order_id, product_id, product_name_ar_snapshot, product_name_en_snapshot,
        unit_price_minor, quantity, tax_minor)
      select v_order_id, p.id, p.name_ar, p.name_en, pp.price_minor, request_item.quantity, 0
      from public.products p join public.product_prices pp on pp.product_id = p.id and pp.currency_code = v_currency_code
      where p.id = product_row.id;
    end if;
  end loop;

  update public.customers set total_orders = total_orders + 1,
    total_spent_minor = jsonb_set(total_spent_minor, array[v_currency_code],
      to_jsonb(coalesce((total_spent_minor ->> v_currency_code)::bigint, 0) + total_due), true),
    first_order_at = coalesce(first_order_at, now()), last_order_at = now(), updated_at = now()
  where id = customer_row.id;
  insert into public.order_events(order_id, event_type, message) values (v_order_id, 'created', 'Order received');
  if coupon_applies then
    insert into public.coupon_redemptions(coupon_id, order_id, customer_id, user_id, amount_discounted_minor, currency_code)
      values (coupon_row.id, v_order_id, customer_row.id, p_user_id, applied_coupon_discount, v_currency_code);
    update public.coupons set usage_count = usage_count + 1 where id = coupon_row.id;
  end if;
  return jsonb_build_object('id', v_order_id, 'order_number', v_order_number, 'status', 'new',
    'currency_code', v_currency_code, 'subtotal_minor', subtotal, 'discount_minor', total_discount,
    'tax_minor', tax_total, 'total_minor', total_due);
end;
$$;

revoke all on function public.create_order(text,text,text,text,jsonb,text,uuid,uuid) from public, anon, authenticated;
grant execute on function public.create_order(text,text,text,text,jsonb,text,uuid,uuid) to service_role;
grant execute on function public.consume_rate_limit(text,integer,integer) to service_role;

commit;
