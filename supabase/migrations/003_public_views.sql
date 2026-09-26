begin;

create or replace view public.public_products with (security_barrier = true) as
select p.id, p.category_id, p.slug, p.name_ar, p.name_en, p.tagline_ar, p.tagline_en,
       p.description_ar, p.description_en, p.platform, p.delivery_type,
       p.delivery_description_ar, p.delivery_description_en, p.region, p.edition,
       p.is_preorder, p.release_date, p.cover_url, p.gallery, p.label_color,
       p.label_preset, p.badge_ar, p.badge_en, p.tags, p.is_featured, p.sort_order,
       p.stock_mode,
       case p.stock_mode
         when 'unlimited' then null
         when 'manual' then p.manual_stock
         else (select count(*)::integer from public.stock_items si where si.product_id = p.id and si.status = 'available')
       end as available_stock,
       p.created_at, p.updated_at
from public.products p
where p.is_active and p.deleted_at is null and (p.visible_from is null or p.visible_from <= now());

create or replace view public.public_product_prices with (security_barrier = true) as
select pp.product_id, pp.currency_code, pp.price_minor, pp.compare_at_price_minor
from public.product_prices pp join public.currencies c on c.code = pp.currency_code and c.is_active;

create or replace view public.public_categories with (security_barrier = true) as
select id, slug, name_ar, name_en, icon_key, cover_url, accent_color, sort_order
from public.categories where is_active;

create or replace view public.public_settings with (security_barrier = true) as
select store_name_ar, store_name_en, whatsapp_number, support_hours_ar, support_hours_en,
       default_currency, default_language, announcement_ar, announcement_en,
       announcement_enabled, maintenance_mode, social_links, business_registration_number,
       low_stock_threshold, order_number_prefix, stock_reservation_minutes, require_login_to_order,
       greeting_boundaries, guest_greeting_name_ar, guest_greeting_name_en,
       discount_stacking_mode, feature_flags, updated_at
from public.store_settings where id = 1;

create or replace view public.public_currencies with (security_barrier = true) as
select code, symbol_ar, symbol_en, decimals, sort_order from public.currencies where is_active;

create or replace view public.public_payment_methods with (security_barrier = true) as
select id, name_ar, name_en, instructions_ar, instructions_en, sort_order
from public.payment_methods where is_active;

create or replace view public.public_banners with (security_barrier = true) as
select id, title_ar, title_en, subtitle_ar, subtitle_en, image_url, cta_label_ar, cta_label_en,
       cta_link, product_id, starts_at, ends_at, sort_order
from public.banners where is_active and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at > now());

create or replace view public.public_bundle_tiers with (security_barrier = true) as
select id, min_items, discount_type, discount_value, label_ar, label_en, sort_order
from public.bundle_tiers where is_active;

create or replace view public.public_greetings with (security_barrier = true) as
select id, slot, message_ar, message_en, icon_key, weight, priority, starts_at, ends_at
from public.greetings where is_active and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at > now());

create or replace view public.my_orders with (security_barrier = true) as
select o.id, o.order_number, o.status, o.currency_code, o.subtotal_minor, o.coupon_code_used,
       o.coupon_discount_minor, o.tier_discount_minor, o.discount_minor, o.tax_minor,
       o.total_minor, o.created_at, o.updated_at, o.delivered_at
from public.orders o where o.user_id = (select auth.uid());

grant select on public.public_products, public.public_product_prices, public.public_categories,
  public.public_settings, public.public_currencies, public.public_payment_methods,
  public.public_banners, public.public_bundle_tiers, public.public_greetings to anon, authenticated;
grant select on public.my_orders to authenticated;

do $$
declare rel text;
begin
  foreach rel in array array['products','product_prices','categories','banners','bundle_tiers','coupons','store_settings','currencies','payment_methods','greetings','orders'] loop
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = rel) then
      execute format('alter publication supabase_realtime add table public.%I', rel);
    end if;
  end loop;
end $$;

commit;
