"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { StoreCategory, StoreCurrency, StoreGreeting, StorePaymentMethod, StorePrice, StoreProduct, StoreSettings, StoreTier, StorefrontData } from "@/types/storefront";

async function readRows<T>(client: NonNullable<ReturnType<typeof createSupabaseBrowserClient>>, relation: string): Promise<T[]> {
  const { data, error } = await client.from(relation).select("*");
  if (error) throw new Error("store_data_unavailable");
  return (data ?? []) as unknown as T[];
}

export async function fetchStorefrontData(): Promise<StorefrontData> {
  const client = createSupabaseBrowserClient();
  if (!client) return { mode: "preview", products: [], prices: [], categories: [], currencies: [], paymentMethods: [], settings: null, tiers: [], greetings: [] };
  const [products, prices, categories, currencies, paymentMethods, settingsRows, tiers, greetings] = await Promise.all([
    readRows<StoreProduct>(client, "public_products"),
    readRows<StorePrice>(client, "public_product_prices"),
    readRows<StoreCategory>(client, "public_categories"),
    readRows<StoreCurrency>(client, "public_currencies"),
    readRows<StorePaymentMethod>(client, "public_payment_methods"),
    readRows<StoreSettings>(client, "public_settings"),
    readRows<StoreTier>(client, "public_bundle_tiers"),
    readRows<StoreGreeting>(client, "public_greetings"),
  ]);
  return { mode: "live", products, prices, categories, currencies, paymentMethods, settings: settingsRows[0] ?? null, tiers, greetings };
}
