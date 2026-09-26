export type StoreProduct = {
  id: string;
  category_id: string | null;
  slug: string;
  name_ar: string;
  name_en: string;
  tagline_ar: string;
  tagline_en: string;
  description_ar: string;
  description_en: string;
  platform: string;
  delivery_type: string;
  delivery_description_ar: string;
  delivery_description_en: string;
  region: string | null;
  edition: string | null;
  is_preorder: boolean;
  release_date: string | null;
  cover_url: string | null;
  gallery: string[];
  label_color: string;
  label_preset: string;
  badge_ar: string | null;
  badge_en: string | null;
  tags: string[];
  is_featured: boolean;
  sort_order: number;
  stock_mode: string;
  available_stock: number | null;
};

export type StorePrice = { product_id: string; currency_code: string; price_minor: number; compare_at_price_minor: number | null };
export type StoreCategory = { id: string; slug: string; name_ar: string; name_en: string; icon_key: string; cover_url: string | null; accent_color: string; sort_order: number };
export type StoreCurrency = { code: string; symbol_ar: string; symbol_en: string; decimals: number; sort_order: number };
export type StorePaymentMethod = { id: string; name_ar: string; name_en: string; instructions_ar: string; instructions_en: string; sort_order: number };
export type StoreSettings = {
  store_name_ar: string; store_name_en: string; whatsapp_number: string | null;
  support_hours_ar: string | null; support_hours_en: string | null; default_currency: string; default_language: "ar" | "en";
  announcement_ar: string | null; announcement_en: string | null; announcement_enabled: boolean;
  maintenance_mode: boolean; social_links: Record<string, string>; business_registration_number: string | null; low_stock_threshold: number;
  order_number_prefix: string; stock_reservation_minutes: number; require_login_to_order: boolean;
  greeting_boundaries: { morning_start: string; afternoon_start: string; evening_start: string; night_start: string };
  guest_greeting_name_ar: string; guest_greeting_name_en: string; discount_stacking_mode: "best_of" | "stack";
};
export type StoreTier = { id: string; min_items: number; discount_type: "percent" | "fixed"; discount_value: number; label_ar: string; label_en: string; sort_order: number };
export type StoreGreeting = { id: string; slot: "morning" | "afternoon" | "evening" | "night" | "special"; message_ar: string; message_en: string; icon_key: string; weight: number; priority: number; starts_at: string | null; ends_at: string | null };

export type StorefrontData = {
  mode: "preview" | "live";
  products: StoreProduct[];
  prices: StorePrice[];
  categories: StoreCategory[];
  currencies: StoreCurrency[];
  paymentMethods: StorePaymentMethod[];
  settings: StoreSettings | null;
  tiers: StoreTier[];
  greetings: StoreGreeting[];
};
