import { notFound } from "next/navigation";
import { createAuthClient } from "@/lib/supabase/server";
import type { StoreProduct, StorePrice } from "@/types/storefront";
import Link from "next/link";
import { formatManualPrice } from "@/lib/money";
import type { CurrencyDefinition, ManualPrice } from "@/lib/money";

export const revalidate = 60;

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const client = await createAuthClient();
  const { data: product } = await client.from("public_products").select("*").eq("slug", slug).maybeSingle();
  if (!product) notFound();
  const item = product as unknown as StoreProduct;
  const { data: priceRows } = await client.from("public_product_prices").select("currency_code,price_minor,compare_at_price_minor").eq("product_id", item.id);
  const prices = (priceRows ?? []) as unknown as StorePrice[];
  const { data: currencyRows } = await client.from("public_currencies").select("code,decimals,symbol_ar,symbol_en");
  const currencies = new Map<string, CurrencyDefinition>((currencyRows ?? []).map((c) => [c.code, { code: c.code, decimals: c.decimals, symbol_ar: c.symbol_ar, symbol_en: c.symbol_en }]));
  const description = item.description_ar || item.description_en;
  return <main className="product-detail" dir="rtl"><Link href="/catalog" className="auth-back">← العودة للمتجر</Link><p className="eyebrow">{item.platform.replaceAll("_", " ")}</p><h1>{item.name_ar}</h1>{item.name_en && <p className="product-detail-en">{item.name_en}</p>}<p className="product-detail-description">{description || item.tagline_ar || item.tagline_en}</p><dl>{item.region && <><dt>المنطقة</dt><dd>{item.region}</dd></>}{item.edition && <><dt>الإصدار</dt><dd>{item.edition}</dd></>}{item.is_preorder && item.release_date && <><dt>تاريخ الإصدار</dt><dd>{new Date(item.release_date).toLocaleDateString("ar")}</dd></>}</dl><section className="product-prices"><h2>الأسعار اليدوية حسب العملة</h2>{prices.length ? prices.map((price) => {const formatted = formatManualPrice(new Map<string, ManualPrice>([[price.currency_code, { price_minor: price.price_minor, compare_at_price_minor: price.compare_at_price_minor }]]), price.currency_code, price.currency_code, currencies, "ar"); return <p key={price.currency_code}><strong>{price.currency_code}</strong> · {formatted?.text}{price.compare_at_price_minor !== null && <del> {formatManualPrice(new Map<string, ManualPrice>([[price.currency_code, { price_minor: price.compare_at_price_minor, compare_at_price_minor: null }]]), price.currency_code, price.currency_code, currencies, "ar")?.text}</del>}</p>}) : <p>لا يوجد سعر منشور حالياً.</p>}</section><p className="product-detail-delivery">{item.delivery_description_ar || item.delivery_description_en}</p><p className="product-detail-hint">أضف المنتج إلى سلتك من صفحة الكتالوج لإكمال الطلب.</p></main>;
}
