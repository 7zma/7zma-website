begin;

create or replace function public.canonicalize_username(input text)
returns text language sql immutable strict set search_path = '' as $$
  select regexp_replace(
    translate(
      regexp_replace(
        translate(lower(normalize(input, NFKC)),
          'أإآٱىةؤئ٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹',
          'اااايهوي01234567890123456789'),
        '[ًٌٍَُِّْـ_.-]', '', 'g'),
      '015@$', 'olsas'),
    '(.)\1+', '\1', 'g');
$$;

create or replace function public.check_username(candidate text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  canonical text;
  v_user_id uuid := (select auth.uid());
  reason_code text;
  suggestions jsonb;
  hit_count integer;
begin
  if v_user_id is null then return jsonb_build_object('available', false, 'reason', 'sign_in_required', 'suggestions', '[]'::jsonb); end if;
  canonical := public.canonicalize_username(candidate);
  insert into public.rate_limits(key, window_start, count, updated_at)
    values ('username:' || v_user_id::text, now(), 1, now())
    on conflict (key) do update set
      count = case when public.rate_limits.window_start < now() - interval '1 minute' then 1 else public.rate_limits.count + 1 end,
      window_start = case when public.rate_limits.window_start < now() - interval '1 minute' then now() else public.rate_limits.window_start end,
      updated_at = now();
  select count into hit_count from public.rate_limits where key = 'username:' || v_user_id::text;
  if hit_count > 12 then return jsonb_build_object('available', false, 'reason', 'rate_limited', 'suggestions', '[]'::jsonb); end if;

  if candidate is null or char_length(candidate) not between 3 and 20
     or candidate !~ '^[A-Za-z0-9٠-٩۰-۹ء-يٮ-ۓەݐ-ݜ_.-]+$'
     or candidate ~ '^[_.-]|[_.-]$' or candidate ~ '^[0-9٠-٩۰-۹]+$' then
    reason_code := 'invalid_format';
  elsif exists (
    select 1 from public.blocked_usernames b
    where (b.match_type = 'exact' and public.canonicalize_username(b.pattern) = canonical)
       or (b.match_type = 'prefix' and canonical like public.canonicalize_username(b.pattern) || '%')
       or (b.match_type = 'contains' and canonical like '%' || public.canonicalize_username(b.pattern) || '%')
  ) then
    reason_code := 'blocked';
  elsif exists (select 1 from public.profiles p where p.username_canonical = canonical and p.user_id <> v_user_id)
     or exists (select 1 from public.reserved_usernames r where r.username_canonical = canonical and r.reserved_until > now()) then
    reason_code := 'taken';
  elsif char_length(canonical) >= 5 and exists (
    select 1 from public.profiles p where p.user_id <> v_user_id and (
      extensions.levenshtein(p.username_canonical, canonical) <= (select username_similarity_distance from public.store_settings where id = 1)
      or extensions.similarity(p.username_canonical, canonical) >= (select username_similarity_threshold from public.store_settings where id = 1)
    )
  ) then
    reason_code := 'too_similar';
  end if;
  suggestions := jsonb_build_array(candidate || '7', candidate || 'x', candidate || '_1');
  return jsonb_build_object('available', reason_code is null, 'reason', reason_code,
    'suggestions', case when reason_code is null then '[]'::jsonb else suggestions end);
end;
$$;

create or replace function public.set_username(candidate text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_user_id uuid := (select auth.uid());
  canonical text;
  old_canonical text;
  old_name text;
  previous_change timestamptz;
  validation jsonb;
begin
  if v_user_id is null then raise exception 'not_authenticated' using errcode = '42501'; end if;
  canonical := public.canonicalize_username(candidate);
  perform pg_advisory_xact_lock(hashtextextended(canonical, 0));
  validation := public.check_username(candidate);
  if not coalesce((validation ->> 'available')::boolean, false) then
    return jsonb_build_object('ok', false, 'reason', validation ->> 'reason', 'suggestions', validation -> 'suggestions');
  end if;
  insert into public.profiles(user_id) values (v_user_id) on conflict (user_id) do nothing;
  select username, username_canonical, username_changed_at into old_name, old_canonical, previous_change
    from public.profiles where profiles.user_id = v_user_id for update;
  if old_canonical is not null and old_canonical <> canonical and previous_change > now() - interval '30 days' then
    return jsonb_build_object('ok', false, 'reason', 'change_cooldown', 'suggestions', '[]'::jsonb);
  end if;
  if old_canonical is not null and old_canonical <> canonical then
    insert into public.reserved_usernames(username_canonical, reserved_until, released_by)
      values (old_canonical, now() + interval '90 days', v_user_id)
      on conflict (username_canonical) do update set reserved_until = excluded.reserved_until, released_by = excluded.released_by;
    insert into public.username_history(user_id, username, username_canonical) values (v_user_id, old_name, old_canonical);
  end if;
  update public.profiles set username = candidate, username_canonical = canonical, username_changed_at = now()
    where profiles.user_id = v_user_id;
  return jsonb_build_object('ok', true, 'username', candidate);
end;
$$;

create or replace function public.validate_coupon(coupon_code text, currency text, items jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  coupon_row public.coupons%rowtype;
  eligible_subtotal bigint;
  bundle_subtotal bigint;
  v_user_id uuid := (select auth.uid());
  default_currency text;
  discount bigint;
begin
  if jsonb_typeof(items) <> 'array' or jsonb_array_length(items) = 0 or jsonb_array_length(items) > 50 then
    return jsonb_build_object('valid', false, 'reason', 'invalid_items');
  end if;
  select c.* into coupon_row from public.coupons c where c.code = upper(btrim(coupon_code)) for share;
  if not found or not coupon_row.is_active then return jsonb_build_object('valid', false, 'reason', 'invalid'); end if;
  if coupon_row.starts_at is not null and coupon_row.starts_at > now() then return jsonb_build_object('valid', false, 'reason', 'not_started'); end if;
  if coupon_row.ends_at is not null and coupon_row.ends_at <= now() then return jsonb_build_object('valid', false, 'reason', 'expired'); end if;
  if coupon_row.usage_limit_total is not null and coupon_row.usage_count >= coupon_row.usage_limit_total then return jsonb_build_object('valid', false, 'reason', 'usage_limit'); end if;
  if coupon_row.usage_limit_per_customer is not null and v_user_id is not null and (
    select count(*) from public.coupon_redemptions cr where cr.coupon_id = coupon_row.id and cr.user_id = v_user_id
  ) >= coupon_row.usage_limit_per_customer then return jsonb_build_object('valid', false, 'reason', 'customer_limit'); end if;
  if coupon_row.scope = 'specific_categories' and not exists(select 1 from public.coupon_categories cc where cc.coupon_id = coupon_row.id) then
    return jsonb_build_object('valid', false, 'reason', 'no_eligible_products');
  end if;
  if not exists(select 1 from public.currencies c where c.code = upper(currency) and c.is_active) then
    return jsonb_build_object('valid', false, 'reason', 'currency_unavailable');
  end if;
  with requested as (
    select (item ->> 'product_id')::uuid as product_id, (item ->> 'quantity')::integer as quantity
    from jsonb_array_elements(items) item
  ), priced as (
    select r.quantity, pp.price_minor, p.category_id
    from requested r join public.products p on p.id = r.product_id and p.is_active and p.deleted_at is null
    join public.product_prices pp on pp.product_id = p.id and pp.currency_code = upper(currency)
    where r.quantity between 1 and 20
  )
  select coalesce(sum(price_minor * quantity), 0),
         coalesce(sum(price_minor * quantity) filter (where coupon_row.scope = 'all_products' or exists (
           select 1 from public.coupon_categories cc where cc.coupon_id = coupon_row.id and cc.category_id = priced.category_id
         )), 0)
    into bundle_subtotal, eligible_subtotal from priced;
  if bundle_subtotal = 0 or eligible_subtotal = 0 then return jsonb_build_object('valid', false, 'reason', 'no_eligible_products'); end if;
  select s.default_currency into default_currency from public.store_settings s where s.id = 1;
  if coupon_row.min_order_amount_minor is not null then
    if upper(currency) <> default_currency then return jsonb_build_object('valid', false, 'reason', 'minimum_currency_unavailable'); end if;
    if bundle_subtotal < coupon_row.min_order_amount_minor then return jsonb_build_object('valid', false, 'reason', 'minimum_not_met'); end if;
  end if;
  discount := floor(eligible_subtotal * coupon_row.percent_off / 100.0)::bigint;
  return jsonb_build_object('valid', true, 'code', coupon_row.code, 'percent_off', coupon_row.percent_off,
    'eligible_subtotal_minor', eligible_subtotal, 'discount_minor', discount, 'currency_code', upper(currency));
end;
$$;

grant execute on function public.canonicalize_username(text) to authenticated;
grant execute on function public.check_username(text) to authenticated;
grant execute on function public.set_username(text) to authenticated;
grant execute on function public.validate_coupon(text, text, jsonb) to anon, authenticated, service_role;

commit;
