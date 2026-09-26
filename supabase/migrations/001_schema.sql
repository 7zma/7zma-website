begin;

create extension if not exists pgcrypto with schema extensions;
create extension if not exists pg_trgm with schema extensions;
create extension if not exists fuzzystrmatch with schema extensions;
create extension if not exists pg_cron with schema pg_catalog;

do $$ begin
  create type public.admin_role as enum ('owner', 'manager', 'support');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.platform as enum ('ps5', 'ps4', 'xbox_series', 'xbox_one', 'pc_steam', 'pc_other', 'switch', 'switch2', 'multi');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.delivery_type as enum ('key', 'account', 'gift_card', 'subscription', 'top_up', 'dlc');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.stock_mode as enum ('tracked', 'manual', 'unlimited');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.tax_mode as enum ('inherit', 'inclusive', 'exclusive', 'none');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.label_preset as enum ('common', 'rare', 'epic', 'legendary', 'custom');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.order_status as enum ('new', 'contacted', 'awaiting_payment', 'paid', 'delivered', 'cancelled', 'refunded');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.stock_status as enum ('available', 'reserved', 'sold', 'void');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.greeting_slot as enum ('morning', 'afternoon', 'evening', 'night', 'special');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.coupon_scope as enum ('all_products', 'specific_categories');
exception when duplicate_object then null; end $$;

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role public.admin_role not null,
  display_name text not null,
  disabled boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text,
  username_canonical text,
  username_changed_at timestamptz,
  avatar_key text,
  preferred_language text not null default 'ar' check (preferred_language in ('ar','en')),
  preferred_currency text,
  is_banned boolean not null default false,
  created_at timestamptz not null default now(),
  constraint username_pair check ((username is null) = (username_canonical is null))
);
create unique index if not exists profiles_username_canonical_uidx on public.profiles(username_canonical) where username_canonical is not null;

create table if not exists public.reserved_usernames (
  username_canonical text primary key,
  reserved_until timestamptz not null,
  released_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.blocked_usernames (
  id uuid primary key default gen_random_uuid(),
  pattern text not null,
  match_type text not null check (match_type in ('exact','prefix','contains')),
  reason text not null,
  created_at timestamptz not null default now(),
  unique(pattern, match_type)
);

create table if not exists public.currencies (
  code text primary key check (code ~ '^[A-Z]{3}$'),
  symbol_ar text not null,
  symbol_en text not null,
  decimals smallint not null default 2 check (decimals between 0 and 4),
  is_active boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.store_settings (
  id smallint primary key default 1 check (id = 1),
  store_name_ar text not null default 'حزمة',
  store_name_en text not null default '7ZMA',
  whatsapp_number text,
  support_hours_ar text,
  support_hours_en text,
  default_currency text not null default 'USD' references public.currencies(code),
  default_language text not null default 'ar' check (default_language in ('ar','en')),
  announcement_ar text,
  announcement_en text,
  announcement_enabled boolean not null default false,
  maintenance_mode boolean not null default false,
  social_links jsonb not null default '{}'::jsonb,
  business_registration_number text,
  low_stock_threshold integer not null default 3 check (low_stock_threshold >= 0),
  order_number_prefix text not null default '7Z' check (order_number_prefix ~ '^[A-Za-z0-9-]{1,10}$'),
  stock_reservation_minutes integer not null default 30 check (stock_reservation_minutes between 1 and 1440),
  require_login_to_order boolean not null default false,
  greeting_boundaries jsonb not null default '{"morning_start":"05:00","afternoon_start":"12:00","evening_start":"17:00","night_start":"21:00"}'::jsonb,
  guest_greeting_name_ar text not null default 'يا بطل',
  guest_greeting_name_en text not null default 'gamer',
  username_similarity_distance smallint not null default 1 check (username_similarity_distance between 0 and 3),
  username_similarity_threshold numeric(3,2) not null default 0.80 check (username_similarity_threshold between 0.50 and 1),
  discount_stacking_mode text not null default 'best_of' check (discount_stacking_mode in ('best_of','stack')),
  feature_flags jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

create table if not exists public.payment_methods (
  id uuid primary key default gen_random_uuid(),
  name_ar text not null,
  name_en text not null,
  instructions_ar text not null default '',
  instructions_en text not null default '',
  sort_order integer not null default 0,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name_ar text not null,
  name_en text not null,
  icon_key text not null default 'gamepad',
  cover_url text,
  accent_color text not null default '#78B4FF' check (accent_color ~ '^#[0-9A-Fa-f]{6}$'),
  sort_order integer not null default 0,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.categories(id) on delete set null,
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name_ar text not null,
  name_en text not null,
  tagline_ar text not null default '',
  tagline_en text not null default '',
  description_ar text not null default '',
  description_en text not null default '',
  platform public.platform not null,
  delivery_type public.delivery_type not null,
  delivery_description_ar text not null,
  delivery_description_en text not null,
  region text,
  edition text,
  is_preorder boolean not null default false,
  release_date timestamptz,
  cover_url text,
  gallery jsonb not null default '[]'::jsonb check (jsonb_typeof(gallery) = 'array'),
  label_color text not null default '#78B4FF' check (label_color ~ '^#[0-9A-Fa-f]{6}$'),
  label_preset public.label_preset not null default 'common',
  badge_ar text,
  badge_en text,
  tags text[] not null default '{}',
  is_featured boolean not null default false,
  is_active boolean not null default false,
  sort_order integer not null default 0,
  seo_title_ar text,
  seo_title_en text,
  seo_description_ar text,
  seo_description_en text,
  stock_mode public.stock_mode not null default 'manual',
  manual_stock integer not null default 0 check (manual_stock >= 0),
  tax_mode public.tax_mode not null default 'inherit',
  visible_from timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint preorder_release_date check (not is_preorder or release_date is not null)
);
create index if not exists products_public_order_idx on public.products(is_active, deleted_at, is_featured desc, sort_order, created_at desc);
create index if not exists products_category_idx on public.products(category_id) where deleted_at is null;
create index if not exists products_platform_idx on public.products(platform) where deleted_at is null;
create index if not exists products_name_ar_trgm_idx on public.products using gin (name_ar extensions.gin_trgm_ops);
create index if not exists products_name_en_trgm_idx on public.products using gin (name_en extensions.gin_trgm_ops);

create table if not exists public.product_prices (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  currency_code text not null references public.currencies(code),
  price_minor bigint not null check (price_minor >= 0),
  compare_at_price_minor bigint check (compare_at_price_minor is null or compare_at_price_minor >= price_minor),
  updated_at timestamptz not null default now(),
  unique(product_id, currency_code)
);
create index if not exists product_prices_currency_idx on public.product_prices(currency_code, product_id);

create table if not exists public.product_private (
  product_id uuid primary key references public.products(id) on delete cascade,
  cost_minor bigint check (cost_minor is null or cost_minor >= 0),
  supplier_note text,
  updated_at timestamptz not null default now()
);

create table if not exists public.bundle_tiers (
  id uuid primary key default gen_random_uuid(),
  min_items integer not null unique check (min_items >= 2),
  discount_type text not null check (discount_type in ('percent','fixed')),
  discount_value integer not null check ((discount_type = 'percent' and discount_value between 1 and 100) or (discount_type = 'fixed' and discount_value > 0)),
  label_ar text not null,
  label_en text not null,
  is_active boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  percent_off smallint not null check (percent_off between 1 and 100),
  scope public.coupon_scope not null,
  description_ar text not null default '',
  description_en text not null default '',
  starts_at timestamptz,
  ends_at timestamptz,
  usage_limit_total integer check (usage_limit_total is null or usage_limit_total >= 1),
  usage_limit_per_customer integer check (usage_limit_per_customer is null or usage_limit_per_customer >= 1),
  min_order_amount_minor bigint check (min_order_amount_minor is null or min_order_amount_minor >= 0),
  usage_count integer not null default 0 check (usage_count >= 0),
  is_active boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint coupon_dates_order check (starts_at is null or ends_at is null or starts_at < ends_at)
);
create index if not exists coupons_active_date_idx on public.coupons(is_active, starts_at, ends_at);

create table if not exists public.coupon_categories (
  coupon_id uuid not null references public.coupons(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  primary key(coupon_id, category_id)
);

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  phone_e164 text not null unique,
  user_id uuid references auth.users(id) on delete set null,
  name text not null,
  tags text[] not null default '{}',
  admin_notes text,
  total_orders integer not null default 0 check (total_orders >= 0),
  total_spent_minor jsonb not null default '{}'::jsonb,
  is_blocked boolean not null default false,
  first_order_at timestamptz,
  last_order_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists customers_user_id_idx on public.customers(user_id) where user_id is not null;
create index if not exists customers_name_trgm_idx on public.customers using gin (name extensions.gin_trgm_ops);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  customer_id uuid not null references public.customers(id) on delete restrict,
  user_id uuid references auth.users(id) on delete set null,
  customer_name text not null,
  phone_e164 text not null,
  customer_note text,
  status public.order_status not null default 'new',
  currency_code text not null references public.currencies(code),
  subtotal_minor bigint not null check (subtotal_minor >= 0),
  coupon_code_used text,
  coupon_discount_minor bigint not null default 0 check (coupon_discount_minor >= 0),
  tier_discount_minor bigint not null default 0 check (tier_discount_minor >= 0),
  discount_minor bigint not null default 0 check (discount_minor >= 0),
  tax_minor bigint not null default 0 check (tax_minor >= 0),
  total_minor bigint not null check (total_minor >= 0),
  payment_method_id uuid references public.payment_methods(id) on delete set null,
  payment_reference text,
  assigned_to uuid references auth.users(id) on delete set null,
  admin_note text,
  source text not null default 'storefront',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  delivered_at timestamptz,
  constraint order_discount_bounds check (discount_minor <= subtotal_minor)
);
create index if not exists orders_status_created_idx on public.orders(status, created_at desc);
create index if not exists orders_customer_idx on public.orders(customer_id, created_at desc);
create index if not exists orders_user_idx on public.orders(user_id, created_at desc) where user_id is not null;
create index if not exists orders_phone_idx on public.orders(phone_e164, created_at desc);
create index if not exists orders_assignee_idx on public.orders(assigned_to, status);
create index if not exists orders_number_trgm_idx on public.orders using gin (order_number extensions.gin_trgm_ops);

create table if not exists public.stock_items (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete restrict,
  secret_encrypted bytea not null,
  secret_hint text,
  status public.stock_status not null default 'available',
  reserved_order_id uuid references public.orders(id) on delete set null,
  reserved_until timestamptz,
  sold_order_id uuid references public.orders(id) on delete set null,
  added_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint stock_reservation_pair check (
    (status = 'reserved' and reserved_order_id is not null and reserved_until is not null)
    or (status <> 'reserved' and reserved_order_id is null and reserved_until is null)
  )
);
create index if not exists stock_items_available_idx on public.stock_items(product_id, created_at) where status = 'available';
create index if not exists stock_items_reserved_idx on public.stock_items(reserved_until) where status = 'reserved';

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  product_name_ar_snapshot text not null,
  product_name_en_snapshot text not null,
  unit_price_minor bigint not null check (unit_price_minor >= 0),
  quantity integer not null check (quantity between 1 and 20),
  tax_minor bigint not null default 0 check (tax_minor >= 0),
  stock_item_id uuid references public.stock_items(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists order_items_order_idx on public.order_items(order_id);
create index if not exists order_items_product_idx on public.order_items(product_id);

alter table public.stock_items drop constraint if exists stock_items_reserved_order_id_fkey;
alter table public.stock_items add constraint stock_items_reserved_order_id_fkey foreign key (reserved_order_id) references public.orders(id) on delete set null;
alter table public.stock_items drop constraint if exists stock_items_sold_order_id_fkey;
alter table public.stock_items add constraint stock_items_sold_order_id_fkey foreign key (sold_order_id) references public.orders(id) on delete set null;

create table if not exists public.coupon_redemptions (
  id uuid primary key default gen_random_uuid(),
  coupon_id uuid not null references public.coupons(id) on delete restrict,
  order_id uuid not null unique references public.orders(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  amount_discounted_minor bigint not null check (amount_discounted_minor >= 0),
  currency_code text not null references public.currencies(code),
  created_at timestamptz not null default now()
);
create index if not exists coupon_redemptions_coupon_idx on public.coupon_redemptions(coupon_id, created_at desc);
create index if not exists coupon_redemptions_user_idx on public.coupon_redemptions(user_id, coupon_id) where user_id is not null;
create index if not exists coupon_redemptions_customer_idx on public.coupon_redemptions(customer_id, coupon_id) where customer_id is not null;

create table if not exists public.banners (
  id uuid primary key default gen_random_uuid(),
  title_ar text not null,
  title_en text not null,
  subtitle_ar text not null default '',
  subtitle_en text not null default '',
  image_url text,
  cta_label_ar text,
  cta_label_en text,
  cta_link text,
  product_id uuid references public.products(id) on delete set null,
  starts_at timestamptz,
  ends_at timestamptz,
  sort_order integer not null default 0,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.greetings (
  id uuid primary key default gen_random_uuid(),
  slot public.greeting_slot not null,
  message_ar text not null,
  message_en text not null,
  icon_key text not null default 'sun',
  weight integer not null default 1 check (weight > 0),
  priority integer not null default 0,
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint greeting_dates_order check (starts_at is null or ends_at is null or starts_at < ends_at)
);
create index if not exists greetings_live_idx on public.greetings(slot, is_active, priority desc);

create table if not exists public.order_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  event_type text not null,
  message text not null,
  actor_id uuid references auth.users(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists order_events_order_idx on public.order_events(order_id, created_at);

create table if not exists public.message_templates (
  id uuid primary key default gen_random_uuid(),
  template_key text not null unique,
  title_ar text not null,
  title_en text not null,
  body_ar text not null,
  body_en text not null,
  variables text[] not null default '{}',
  is_active boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists public.message_log (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete restrict,
  admin_id uuid not null references auth.users(id) on delete restrict,
  template_key text,
  channel text not null default 'whatsapp' check (channel in ('whatsapp','phone','email','other')),
  created_at timestamptz not null default now()
);
create index if not exists message_log_order_idx on public.message_log(order_id, created_at desc);

create table if not exists public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users(id) on delete set null,
  actor_label text not null default '',
  action text not null,
  table_name text not null,
  record_id text,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz not null default now()
);
create index if not exists audit_logs_created_idx on public.audit_logs(created_at desc);
create index if not exists audit_logs_actor_idx on public.audit_logs(actor_id, created_at desc);

create table if not exists public.rate_limits (
  key text primary key,
  window_start timestamptz not null,
  count integer not null default 0 check (count >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.username_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  username text not null,
  username_canonical text not null,
  changed_at timestamptz not null default now()
);
create index if not exists username_history_user_idx on public.username_history(user_id, changed_at desc);

create table if not exists public.admin_filter_views (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  filters jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, name)
);

create table if not exists public.customer_notes (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete restrict,
  note text not null,
  created_at timestamptz not null default now()
);
create index if not exists customer_notes_customer_idx on public.customer_notes(customer_id, created_at desc);

create table if not exists public.live_activity_settings (
  id smallint primary key default 1 check (id = 1),
  enabled boolean not null default false,
  updated_at timestamptz not null default now()
);

do $$
declare rel record;
begin
  for rel in select schemaname, tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table %I.%I enable row level security', rel.schemaname, rel.tablename);
  end loop;
end $$;

do $$
declare rel text;
begin
  foreach rel in array array['payment_methods','categories','products','product_prices','product_private','banners','greetings','message_templates','customers','orders','store_settings','coupons','admin_filter_views'] loop
    execute format('drop trigger if exists set_updated_at on public.%I', rel);
    execute format('create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()', rel);
  end loop;
end $$;

insert into public.currencies(code, symbol_ar, symbol_en, decimals, is_active, sort_order)
values ('USD', '$', '$', 2, false, 0)
on conflict (code) do nothing;
insert into public.store_settings(id) values (1) on conflict (id) do nothing;
insert into public.live_activity_settings(id) values (1) on conflict (id) do nothing;

commit;
