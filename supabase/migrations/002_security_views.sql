begin;

revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke execute on all functions in schema public from public, anon, authenticated;
grant usage on schema public to anon, authenticated;

create or replace function public.has_role(allowed_roles public.admin_role[])
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select auth.jwt() ->> 'aal' = 'aal2'), false)
    and exists (select 1 from public.admin_users au
      where au.user_id = (select auth.uid()) and not au.disabled and au.role = any (allowed_roles));
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select public.has_role(array['owner','manager','support']::public.admin_role[]);
$$;

grant execute on function public.has_role(public.admin_role[]) to authenticated;
grant execute on function public.is_admin() to authenticated;

grant select on public.admin_users, public.profiles to authenticated;
grant update (avatar_key, preferred_language, preferred_currency) on public.profiles to authenticated;
grant select on public.customers, public.orders, public.order_items, public.order_events,
  public.message_templates, public.message_log, public.admin_filter_views, public.customer_notes,
  public.categories, public.products, public.product_prices, public.coupons, public.coupon_categories,
  public.coupon_redemptions, public.banners, public.bundle_tiers, public.greetings, public.currencies,
  public.payment_methods, public.store_settings, public.username_history, public.blocked_usernames,
  public.product_private, public.audit_logs, public.live_activity_settings to authenticated;
grant select (id, product_id, secret_hint, status, reserved_order_id, reserved_until, sold_order_id, added_by, created_at)
  on public.stock_items to authenticated;
grant select on public.rate_limits to service_role;
grant insert, update, delete on public.categories, public.products, public.product_prices,
  public.product_private, public.banners, public.bundle_tiers, public.coupons, public.coupon_categories,
  public.greetings, public.currencies, public.payment_methods, public.message_templates,
  public.blocked_usernames, public.store_settings, public.live_activity_settings to authenticated;
grant insert, update, delete on public.admin_filter_views to authenticated;
grant insert on public.customer_notes, public.message_log to authenticated;
grant usage, select on all sequences in schema public to authenticated;

create policy admin_users_read on public.admin_users for select to authenticated
  using (public.has_role(array['owner','manager','support']::public.admin_role[]));
create policy profiles_self_read on public.profiles for select to authenticated using (user_id = (select auth.uid()));
create policy profiles_self_update on public.profiles for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy profiles_admin_read on public.profiles for select to authenticated using (public.has_role(array['owner','manager']::public.admin_role[]));
create policy profiles_admin_update on public.profiles for update to authenticated using (public.has_role(array['owner','manager']::public.admin_role[])) with check (public.has_role(array['owner','manager']::public.admin_role[]));

create policy categories_admin_read on public.categories for select to authenticated using (public.has_role(array['owner','manager']::public.admin_role[]));
create policy categories_admin_write on public.categories for all to authenticated using (public.has_role(array['owner','manager']::public.admin_role[])) with check (public.has_role(array['owner','manager']::public.admin_role[]));
create policy products_admin_read on public.products for select to authenticated using (public.has_role(array['owner','manager']::public.admin_role[]));
create policy products_admin_write on public.products for all to authenticated using (public.has_role(array['owner','manager']::public.admin_role[])) with check (public.has_role(array['owner','manager']::public.admin_role[]));
create policy prices_admin_read on public.product_prices for select to authenticated using (public.has_role(array['owner','manager']::public.admin_role[]));
create policy prices_admin_write on public.product_prices for all to authenticated using (public.has_role(array['owner','manager']::public.admin_role[])) with check (public.has_role(array['owner','manager']::public.admin_role[]));
create policy private_admin_read on public.product_private for select to authenticated using (public.has_role(array['owner','manager']::public.admin_role[]));
create policy private_admin_write on public.product_private for all to authenticated using (public.has_role(array['owner','manager']::public.admin_role[])) with check (public.has_role(array['owner','manager']::public.admin_role[]));

create policy coupons_admin_read on public.coupons for select to authenticated using (public.has_role(array['owner','manager']::public.admin_role[]));
create policy coupons_admin_write on public.coupons for all to authenticated using (public.has_role(array['owner','manager']::public.admin_role[])) with check (public.has_role(array['owner','manager']::public.admin_role[]));
create policy coupon_categories_admin_read on public.coupon_categories for select to authenticated using (public.has_role(array['owner','manager']::public.admin_role[]));
create policy coupon_categories_admin_write on public.coupon_categories for all to authenticated using (public.has_role(array['owner','manager']::public.admin_role[])) with check (public.has_role(array['owner','manager']::public.admin_role[]));
create policy redemptions_admin_read on public.coupon_redemptions for select to authenticated using (public.has_role(array['owner','manager']::public.admin_role[]));

create policy currencies_admin_read on public.currencies for select to authenticated using (public.has_role(array['owner','manager']::public.admin_role[]));
create policy currencies_admin_write on public.currencies for all to authenticated using (public.has_role(array['owner','manager']::public.admin_role[])) with check (public.has_role(array['owner','manager']::public.admin_role[]));
create policy payment_methods_admin_read on public.payment_methods for select to authenticated using (public.has_role(array['owner','manager']::public.admin_role[]));
create policy payment_methods_admin_write on public.payment_methods for all to authenticated using (public.has_role(array['owner','manager']::public.admin_role[])) with check (public.has_role(array['owner','manager']::public.admin_role[]));
create policy store_settings_owner_read on public.store_settings for select to authenticated using (public.has_role(array['owner']::public.admin_role[]));
create policy store_settings_owner_write on public.store_settings for all to authenticated using (public.has_role(array['owner']::public.admin_role[])) with check (public.has_role(array['owner']::public.admin_role[]));

create policy banners_admin_read on public.banners for select to authenticated using (public.has_role(array['owner','manager']::public.admin_role[]));
create policy banners_admin_write on public.banners for all to authenticated using (public.has_role(array['owner','manager']::public.admin_role[])) with check (public.has_role(array['owner','manager']::public.admin_role[]));
create policy tiers_admin_read on public.bundle_tiers for select to authenticated using (public.has_role(array['owner','manager']::public.admin_role[]));
create policy tiers_admin_write on public.bundle_tiers for all to authenticated using (public.has_role(array['owner','manager']::public.admin_role[])) with check (public.has_role(array['owner','manager']::public.admin_role[]));
create policy greetings_admin_read on public.greetings for select to authenticated using (public.has_role(array['owner','manager']::public.admin_role[]));
create policy greetings_admin_write on public.greetings for all to authenticated using (public.has_role(array['owner','manager']::public.admin_role[])) with check (public.has_role(array['owner','manager']::public.admin_role[]));
create policy templates_admin_read on public.message_templates for select to authenticated using (public.has_role(array['owner','manager','support']::public.admin_role[]));
create policy templates_admin_write on public.message_templates for all to authenticated using (public.has_role(array['owner','manager']::public.admin_role[])) with check (public.has_role(array['owner','manager']::public.admin_role[]));

create policy customers_admin_read on public.customers for select to authenticated using (public.has_role(array['owner','manager','support']::public.admin_role[]));
create policy customers_manager_update on public.customers for update to authenticated using (public.has_role(array['owner','manager']::public.admin_role[])) with check (public.has_role(array['owner','manager']::public.admin_role[]));
create policy orders_admin_read on public.orders for select to authenticated using (public.has_role(array['owner','manager','support']::public.admin_role[]));
create policy order_items_admin_read on public.order_items for select to authenticated using (public.has_role(array['owner','manager','support']::public.admin_role[]));
create policy order_events_admin_read on public.order_events for select to authenticated using (public.has_role(array['owner','manager','support']::public.admin_role[]));
create policy message_log_admin_read on public.message_log for select to authenticated using (public.has_role(array['owner','manager','support']::public.admin_role[]));
create policy message_log_admin_insert on public.message_log for insert to authenticated with check (public.has_role(array['owner','manager','support']::public.admin_role[]) and admin_id = (select auth.uid()));
create policy stock_items_manager_read on public.stock_items for select to authenticated using (public.has_role(array['owner','manager']::public.admin_role[]));
create policy stock_items_manager_insert on public.stock_items for insert to authenticated with check (public.has_role(array['owner','manager']::public.admin_role[]));
create policy stock_items_manager_update on public.stock_items for update to authenticated using (public.has_role(array['owner','manager']::public.admin_role[])) with check (public.has_role(array['owner','manager']::public.admin_role[]));
create policy audit_logs_admin_read on public.audit_logs for select to authenticated using (public.has_role(array['owner','manager']::public.admin_role[]));
create policy username_history_admin_read on public.username_history for select to authenticated using (public.has_role(array['owner','manager']::public.admin_role[]));
create policy blocked_names_admin_read on public.blocked_usernames for select to authenticated using (public.has_role(array['owner','manager']::public.admin_role[]));
create policy blocked_names_admin_write on public.blocked_usernames for all to authenticated using (public.has_role(array['owner','manager']::public.admin_role[])) with check (public.has_role(array['owner','manager']::public.admin_role[]));
create policy admin_filter_views_self on public.admin_filter_views for all to authenticated using (user_id = (select auth.uid()) and public.is_admin()) with check (user_id = (select auth.uid()) and public.is_admin());
create policy customer_notes_read on public.customer_notes for select to authenticated using (public.has_role(array['owner','manager','support']::public.admin_role[]));
create policy customer_notes_insert on public.customer_notes for insert to authenticated with check (public.has_role(array['owner','manager','support']::public.admin_role[]) and author_id = (select auth.uid()));
create policy live_settings_read on public.live_activity_settings for select to authenticated using (public.has_role(array['owner','manager']::public.admin_role[]));
create policy live_settings_write on public.live_activity_settings for all to authenticated using (public.has_role(array['owner']::public.admin_role[])) with check (public.has_role(array['owner']::public.admin_role[]));

commit;
