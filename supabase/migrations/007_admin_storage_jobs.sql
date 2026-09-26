begin;

create policy orders_customer_read on public.orders for select to authenticated
  using (user_id = (select auth.uid()));
create policy order_items_customer_read on public.order_items for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id and o.user_id = (select auth.uid())));
create policy order_events_customer_read on public.order_events for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id and o.user_id = (select auth.uid())));

create or replace function public.audit_admin_row()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  before_row jsonb;
  after_row jsonb;
  record_key text;
  actor_email text;
begin
  if coalesce(auth.role(), '') <> 'authenticated' then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;
  if tg_op <> 'INSERT' then
    before_row := to_jsonb(old) - 'secret_encrypted' - 'secret_digest';
  end if;
  if tg_op <> 'DELETE' then
    after_row := to_jsonb(new) - 'secret_encrypted' - 'secret_digest';
  end if;
  record_key := coalesce(after_row ->> 'id', after_row ->> 'product_id', after_row ->> 'code', after_row ->> 'slug', before_row ->> 'id', before_row ->> 'product_id', before_row ->> 'code', before_row ->> 'slug');
  select u.email into actor_email from auth.users u where u.id = (select auth.uid());
  insert into public.audit_logs(actor_id, actor_label, action, table_name, record_id, before_data, after_data)
    values ((select auth.uid()), coalesce(actor_email, ''), lower(tg_op), tg_table_name, record_key, before_row, after_row);
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;
revoke all on function public.audit_admin_row() from public, anon, authenticated;

do $$
declare rel text;
begin
  foreach rel in array array['categories','products','product_prices','product_private','coupons',
    'coupon_categories','banners','bundle_tiers','greetings','currencies','payment_methods',
    'store_settings','message_templates','blocked_usernames','live_activity_settings','customers'] loop
    execute format('drop trigger if exists audit_admin_changes on public.%I', rel);
    execute format('create trigger audit_admin_changes after insert or update or delete on public.%I for each row execute function public.audit_admin_row()', rel);
  end loop;
end $$;

create or replace function public.set_admin_user(p_user_id uuid, p_role public.admin_role, p_display_name text, p_disabled boolean default false)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  auth_time bigint;
  before_row jsonb;
begin
  if not public.has_role(array['owner']::public.admin_role[]) then raise exception 'not_authorized' using errcode = '42501'; end if;
  auth_time := nullif(auth.jwt() ->> 'auth_time', '')::bigint;
  if auth_time is null or auth_time < extract(epoch from now() - interval '5 minutes')::bigint then raise exception 'reauthentication_required' using errcode = '42501'; end if;
  if not exists (select 1 from auth.users u where u.id = p_user_id) or length(btrim(p_display_name)) not between 1 and 120 then
    raise exception 'invalid_admin' using errcode = '22023';
  end if;
  select to_jsonb(au) into before_row from public.admin_users au where au.user_id = p_user_id for update;
  if p_user_id = (select auth.uid()) and (p_role <> 'owner' or p_disabled)
     and (select count(*) from public.admin_users au where au.role = 'owner' and not au.disabled) <= 1 then
    raise exception 'last_owner_cannot_be_disabled' using errcode = '22023';
  end if;
  insert into public.admin_users(user_id, role, display_name, disabled)
    values (p_user_id, p_role, btrim(p_display_name), p_disabled)
    on conflict (user_id) do update set role = excluded.role, display_name = excluded.display_name, disabled = excluded.disabled;
  insert into public.audit_logs(actor_id, actor_label, action, table_name, record_id, before_data, after_data)
    values ((select auth.uid()), coalesce((select u.email from auth.users u where u.id = (select auth.uid())), ''),
      'admin.access', 'admin_users', p_user_id::text, before_row,
      jsonb_build_object('role', p_role, 'display_name', btrim(p_display_name), 'disabled', p_disabled));
  return jsonb_build_object('ok', true);
end;
$$;
revoke all on function public.set_admin_user(uuid,public.admin_role,text,boolean) from public, anon;
grant execute on function public.set_admin_user(uuid,public.admin_role,text,boolean) to authenticated;

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('product-media', 'product-media', true, 2097152, array['image/webp','image/png','image/jpeg','image/avif'])
on conflict (id) do update set public = true, file_size_limit = 2097152,
  allowed_mime_types = array['image/webp','image/png','image/jpeg','image/avif'];

drop policy if exists product_media_public_read on storage.objects;
create policy product_media_public_read on storage.objects for select to anon, authenticated
  using (bucket_id = 'product-media');
drop policy if exists product_media_admin_insert on storage.objects;
create policy product_media_admin_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'product-media' and public.has_role(array['owner','manager']::public.admin_role[]));
drop policy if exists product_media_admin_update on storage.objects;
create policy product_media_admin_update on storage.objects for update to authenticated
  using (bucket_id = 'product-media' and public.has_role(array['owner','manager']::public.admin_role[]))
  with check (bucket_id = 'product-media' and public.has_role(array['owner','manager']::public.admin_role[]));
drop policy if exists product_media_admin_delete on storage.objects;
create policy product_media_admin_delete on storage.objects for delete to authenticated
  using (bucket_id = 'product-media' and public.has_role(array['owner','manager']::public.admin_role[]));

select cron.schedule('release-expired-stock-reservations', '*/10 * * * *', 'select public.release_expired_reservations()')
where not exists (select 1 from cron.job where jobname = 'release-expired-stock-reservations');

commit;
