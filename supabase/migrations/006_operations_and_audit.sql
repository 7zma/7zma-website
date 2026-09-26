begin;

alter table public.customers add column if not exists is_anonymized boolean not null default false;
alter table public.stock_items add column if not exists secret_digest bytea;
create unique index if not exists stock_items_digest_uidx on public.stock_items(product_id, secret_digest) where secret_digest is not null;

create or replace function public.track_order(p_order_number text, p_phone_e164 text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare result jsonb;
begin
  select jsonb_build_object(
    'order_number', o.order_number,
    'status', o.status,
    'currency_code', o.currency_code,
    'currency_decimals', (select c.decimals from public.currencies c where c.code = o.currency_code),
    'subtotal_minor', o.subtotal_minor,
    'discount_minor', o.discount_minor,
    'tax_minor', o.tax_minor,
    'total_minor', o.total_minor,
    'created_at', o.created_at,
    'items', coalesce((select jsonb_agg(jsonb_build_object(
      'name_ar', oi.product_name_ar_snapshot,
      'name_en', oi.product_name_en_snapshot,
      'quantity', oi.quantity
    ) order by oi.created_at) from public.order_items oi where oi.order_id = o.id), '[]'::jsonb)
  ) into result
  from public.orders o
  where o.order_number = upper(btrim(p_order_number)) and o.phone_e164 = p_phone_e164;
  return result;
end;
$$;
revoke all on function public.track_order(text,text) from public, anon, authenticated;
grant execute on function public.track_order(text,text) to service_role;

create or replace function public.release_expired_reservations()
returns integer language plpgsql security definer set search_path = '' as $$
declare released integer;
begin
  update public.stock_items set status = 'available', reserved_order_id = null, reserved_until = null
  where status = 'reserved' and reserved_until <= now();
  get diagnostics released = row_count;
  return released;
end;
$$;
revoke all on function public.release_expired_reservations() from public, anon, authenticated;
grant execute on function public.release_expired_reservations() to service_role;

create or replace function public.set_order_status(p_order_id uuid, p_new_status public.order_status, p_note text default '')
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  old_status public.order_status;
  order_row public.orders%rowtype;
  valid_transition boolean := false;
begin
  if not public.has_role(array['owner','manager','support']::public.admin_role[]) then raise exception 'not_authorized' using errcode = '42501'; end if;
  if length(coalesce(p_note, '')) > 1000 then raise exception 'invalid_note' using errcode = '22023'; end if;
  select * into order_row from public.orders where id = p_order_id for update;
  if not found then raise exception 'order_not_found' using errcode = 'P0002'; end if;
  old_status := order_row.status;
  valid_transition := case old_status
    when 'new' then p_new_status in ('contacted','cancelled')
    when 'contacted' then p_new_status in ('awaiting_payment','paid','cancelled')
    when 'awaiting_payment' then p_new_status in ('paid','cancelled')
    when 'paid' then p_new_status in ('delivered','refunded')
    when 'delivered' then p_new_status = 'refunded'
    else false
  end;
  if not valid_transition then raise exception 'invalid_status_transition' using errcode = '22023'; end if;
  if p_new_status = 'delivered' and exists (
    select 1 from public.order_items oi join public.products p on p.id = oi.product_id
    left join public.stock_items si on si.id = oi.stock_item_id
    where oi.order_id = p_order_id and p.stock_mode = 'tracked'
      and (oi.stock_item_id is null or si.status <> 'reserved'
        or si.reserved_order_id is distinct from p_order_id
        or si.reserved_until is null or si.reserved_until <= now())
  ) then raise exception 'stock_not_allocated' using errcode = '22023'; end if;

  update public.orders set status = p_new_status,
    delivered_at = case when p_new_status = 'delivered' then now() else delivered_at end,
    updated_at = now()
  where id = p_order_id;

  if p_new_status in ('cancelled','refunded') and old_status <> 'delivered' then
    update public.stock_items set status = 'available', reserved_order_id = null, reserved_until = null
      where reserved_order_id = p_order_id and status = 'reserved';
    update public.products p set manual_stock = p.manual_stock + counts.quantity
      from (select oi.product_id, sum(oi.quantity)::integer quantity from public.order_items oi
            join public.products px on px.id = oi.product_id and px.stock_mode = 'manual'
            where oi.order_id = p_order_id and oi.stock_item_id is null group by oi.product_id) counts
      where p.id = counts.product_id;
  elsif p_new_status = 'delivered' then
    update public.stock_items set status = 'sold', sold_order_id = p_order_id,
      reserved_order_id = null, reserved_until = null
      where reserved_order_id = p_order_id and status = 'reserved';
  end if;
  insert into public.order_events(order_id, event_type, message, actor_id)
    values (p_order_id, 'status_changed', concat(old_status::text, ' → ', p_new_status::text, case when coalesce(p_note,'') = '' then '' else ': ' || p_note end), (select auth.uid()));
  insert into public.audit_logs(actor_id, actor_label, action, table_name, record_id, before_data, after_data)
    values ((select auth.uid()), coalesce((select email from auth.users where id = (select auth.uid())), ''),
      'order.status', 'orders', p_order_id::text, jsonb_build_object('status', old_status), jsonb_build_object('status', p_new_status, 'note', coalesce(p_note,'')));
  return jsonb_build_object('id', p_order_id, 'status', p_new_status);
end;
$$;
revoke all on function public.set_order_status(uuid,public.order_status,text) from public, anon;
grant execute on function public.set_order_status(uuid,public.order_status,text) to authenticated;

create or replace function public.stock_encryption_key()
returns text language plpgsql stable security definer set search_path = '' as $$
declare result text;
begin
  execute 'select decrypted_secret from vault.decrypted_secrets where name = $1 limit 1'
    into result using '7zma_stock_encryption_key';
  return result;
end;
$$;
revoke all on function public.stock_encryption_key() from public, anon, authenticated;

create or replace function public.add_stock_items(p_product_id uuid, p_secrets text[])
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  secret_value text;
  encryption_key text;
  added integer := 0;
  duplicates integer := 0;
begin
  if not public.has_role(array['owner','manager']::public.admin_role[]) then raise exception 'not_authorized' using errcode = '42501'; end if;
  if coalesce(array_length(p_secrets, 1), 0) not between 1 and 500 then raise exception 'invalid_stock_batch' using errcode = '22023'; end if;
  if not exists(select 1 from public.products where id = p_product_id and stock_mode = 'tracked') then raise exception 'tracked_product_required' using errcode = '22023'; end if;
  encryption_key := public.stock_encryption_key();
  if encryption_key is null or length(encryption_key) < 32 then raise exception 'stock_encryption_not_configured' using errcode = '55000'; end if;
  foreach secret_value in array p_secrets loop
    secret_value := btrim(secret_value);
    if length(secret_value) not between 1 and 4000 then raise exception 'invalid_stock_value' using errcode = '22023'; end if;
    begin
      insert into public.stock_items(product_id, secret_encrypted, secret_digest, secret_hint, added_by)
      values (p_product_id, extensions.pgp_sym_encrypt(secret_value, encryption_key),
        extensions.hmac(secret_value, encryption_key, 'sha256'), right(secret_value, 4), (select auth.uid()));
      added := added + 1;
    exception when unique_violation then
      duplicates := duplicates + 1;
    end;
  end loop;
  insert into public.audit_logs(actor_id, actor_label, action, table_name, record_id, after_data)
    values ((select auth.uid()), coalesce((select email from auth.users where id = (select auth.uid())), ''),
      'stock.add', 'stock_items', p_product_id::text, jsonb_build_object('added', added, 'duplicates', duplicates));
  return jsonb_build_object('added', added, 'duplicates', duplicates);
end;
$$;
revoke all on function public.add_stock_items(uuid,text[]) from public, anon;
grant execute on function public.add_stock_items(uuid,text[]) to authenticated;

create or replace function public.reveal_stock_secret(p_stock_item_id uuid)
returns text language plpgsql security definer set search_path = '' as $$
declare
  encrypted_secret bytea;
  key_value text;
  auth_time bigint;
  secret_value text;
begin
  if not public.has_role(array['owner','manager']::public.admin_role[]) then raise exception 'not_authorized' using errcode = '42501'; end if;
  auth_time := nullif(auth.jwt() ->> 'auth_time', '')::bigint;
  if auth_time is null or auth_time < extract(epoch from now() - interval '5 minutes')::bigint then raise exception 'reauthentication_required' using errcode = '42501'; end if;
  select secret_encrypted into encrypted_secret from public.stock_items where id = p_stock_item_id for update;
  if not found then raise exception 'stock_not_found' using errcode = 'P0002'; end if;
  key_value := public.stock_encryption_key();
  if key_value is null then raise exception 'stock_encryption_not_configured' using errcode = '55000'; end if;
  secret_value := extensions.pgp_sym_decrypt(encrypted_secret, key_value);
  insert into public.audit_logs(actor_id, actor_label, action, table_name, record_id)
    values ((select auth.uid()), coalesce((select email from auth.users where id = (select auth.uid())), ''),
      'stock.reveal', 'stock_items', p_stock_item_id::text);
  return secret_value;
end;
$$;
revoke all on function public.reveal_stock_secret(uuid) from public, anon;
grant execute on function public.reveal_stock_secret(uuid) to authenticated;

create or replace function public.delete_my_account()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_user_id uuid := (select auth.uid());
  auth_time bigint;
  old_canonical text;
begin
  if v_user_id is null then raise exception 'not_authenticated' using errcode = '42501'; end if;
  auth_time := nullif(auth.jwt() ->> 'auth_time', '')::bigint;
  if auth_time is null or auth_time < extract(epoch from now() - interval '5 minutes')::bigint then raise exception 'reauthentication_required' using errcode = '42501'; end if;
  select username_canonical into old_canonical from public.profiles where profiles.user_id = v_user_id for update;
  if old_canonical is not null then
    insert into public.reserved_usernames(username_canonical, reserved_until, released_by)
      values (old_canonical, now() + interval '90 days', v_user_id)
      on conflict (username_canonical) do update set reserved_until = excluded.reserved_until, released_by = excluded.released_by;
  end if;
  update public.orders o set user_id = null, customer_name = 'Deleted customer', phone_e164 = 'anonymized', customer_note = null
    where o.user_id = v_user_id;
  update public.customers set user_id = null, name = 'Deleted customer', phone_e164 = 'anonymized:' || id::text,
    admin_notes = null, tags = '{}', is_anonymized = true, updated_at = now()
    where customers.user_id = v_user_id;
  delete from public.profiles where profiles.user_id = v_user_id;
  insert into public.audit_logs(actor_id, actor_label, action, table_name, record_id)
    values (v_user_id, '', 'account.delete', 'profiles', v_user_id::text);
  return jsonb_build_object('ok', true);
end;
$$;
grant execute on function public.delete_my_account() to authenticated;

commit;
