"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, type CSSProperties, type PointerEvent } from "react";
import { motion, useMotionValue, useReducedMotion, useSpring } from "framer-motion";
import { Plus } from "lucide-react";
import { formatManualPrice, type ManualPrice, type CurrencyDefinition } from "@/lib/money";
import { getMessages } from "@/lib/i18n";
import type { Locale } from "@/types/locale";
import type { StoreProduct } from "@/types/storefront";

type Copy = ReturnType<typeof getMessages>;
type MessageKey = keyof Copy;
type TintStyle = CSSProperties & { "--card-tint": string };

const platformKeys: Readonly<Record<string, MessageKey>> = {
  ps5: "platformPs", ps4: "platformPs", xbox_series: "platformXbox", xbox_one: "platformXbox",
  pc_steam: "platformPc", pc_other: "platformPc", switch: "platformSwitch", switch2: "platformSwitch",
};

const deliveryKeys: Readonly<Record<string, MessageKey>> = {
  key: "deliveryKey", account: "deliveryAccount", gift_card: "deliveryGiftCard",
  subscription: "deliverySubscription", top_up: "deliveryTopUp", dlc: "deliveryDlc",
};

export function ProductCard({
  product, prices, currencies, currency, defaultCurrency, locale, copy, lowStockThreshold, add, index = 0,
}: {
  product: StoreProduct;
  prices: ReadonlyMap<string, ManualPrice>;
  currencies: ReadonlyMap<string, CurrencyDefinition>;
  currency: string | null;
  defaultCurrency: string;
  locale: Locale;
  copy: Copy;
  lowStockThreshold: number;
  add: (productId: string) => void;
  index?: number;
}) {
  const reduceMotion = useReducedMotion();
  const rotateXRaw = useMotionValue(0);
  const rotateYRaw = useMotionValue(0);
  const rotateX = useSpring(rotateXRaw, { stiffness: 190, damping: 22, mass: .32 });
  const rotateY = useSpring(rotateYRaw, { stiffness: 190, damping: 22, mass: .32 });
  const cardStyle = useMemo(() => ({ rotateX: reduceMotion ? 0 : rotateX, rotateY: reduceMotion ? 0 : rotateY, transformPerspective: 950 }), [reduceMotion, rotateX, rotateY]);
  function tilt(event: PointerEvent<HTMLElement>) {
    if (reduceMotion || event.pointerType === "touch") return;
    const box = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - box.left) / box.width - .5;
    const y = (event.clientY - box.top) / box.height - .5;
    rotateYRaw.set(x * 7);
    rotateXRaw.set(y * -7);
    event.currentTarget.style.setProperty("--pointer-x", `${((x + .5) * 100).toFixed(1)}%`);
    event.currentTarget.style.setProperty("--pointer-y", `${((y + .5) * 100).toFixed(1)}%`);
  }
  function resetTilt() { rotateXRaw.set(0); rotateYRaw.set(0); }
  const current = currency ? formatManualPrice(prices, currency, defaultCurrency, currencies, locale) : null;
  const selectedPrice = currency ? prices.get(currency) : undefined;
  const comparePrice = selectedPrice?.compare_at_price_minor ?? null;
  const compare = comparePrice !== null && currency
    ? formatManualPrice(new Map([[currency, { price_minor: comparePrice, compare_at_price_minor: null }]]), currency, defaultCurrency, currencies, locale)
    : null;
  const title = locale === "ar" ? product.name_ar : product.name_en;
  const badge = product.is_preorder ? copy.badgePreorder : (locale === "ar" ? product.badge_ar : product.badge_en);
  const platformKey = platformKeys[product.platform];
  const deliveryKey = deliveryKeys[product.delivery_type];
  const platform = platformKey ? copy[platformKey] : product.platform;
  const delivery = deliveryKey ? copy[deliveryKey] : product.delivery_type;
  const outOfStock = product.available_stock !== null && product.available_stock <= 0;
  const canAdd = !outOfStock && current !== null;
  const threshold = Math.max(1, lowStockThreshold);
  const stockPercent = product.available_stock === null ? 100 : Math.min(100, (product.available_stock / threshold) * 100);

  return (
    <motion.article className="product-card product-card--custom" style={{ ...({ "--card-tint": product.label_color } as TintStyle), ...cardStyle }} onPointerMove={tilt} onPointerLeave={resetTilt} initial={reduceMotion ? false : { opacity: 0, y: 34, scale: .975 }} whileInView={{ opacity: 1, y: 0, scale: 1 }} viewport={{ once: true, amount: .14 }} transition={{ duration: .65, delay: Math.min(index * .07, .35), ease: [.2,.84,.28,1] }} whileHover={reduceMotion ? undefined : { y: -5, transition: { duration: .24 } }}>
      <Link className="card-visual" href={"/store/" + product.slug} aria-label={title}>
        <div className="card-halo" />
        {product.cover_url ? <Image fill sizes="(max-width: 640px) 44vw, (max-width: 900px) 40vw, 260px" src={product.cover_url} alt="" className="catalog-cover-img" /> : <div className="cover-art"><span className="cover-orbit" /><span className="cover-core" /><span className="cover-streak" /></div>}
        {badge && <span className="card-badge">{badge}</span>}
        <span className="card-platform">{platform}</span>
        <span className="card-color-label">{delivery}</span>
      </Link>
      <div className="card-copy">
        <div className="card-title-row"><Link href={"/store/" + product.slug}><h3>{title}</h3></Link><span className="card-info-dot" aria-hidden="true">i</span></div>
        <p className="sample-note">{locale === "ar" ? product.tagline_ar : product.tagline_en}</p>
        {current?.usedDefaultFallback && <p className="fallback-price-note">{copy.fallbackPriceNote}</p>}
        <div className="card-footer">
          <div className="price-stack">
            {current ? <><span className="price-current">{current.text}</span>{compare && <del className="price-compare">{compare.text}</del>}</> : <span className="price-pending">{copy.priceUnavailable}</span>}
            {outOfStock && <span className="stock-label">{copy.outOfStock}</span>}
          </div>
          <button className="add-button" disabled={!canAdd} aria-label={copy.addToBundle + ": " + title} onClick={() => add(product.id)}>
            <Plus size={16} /><span>{copy.addToBundle}</span>
          </button>
        </div>
        {!outOfStock && product.stock_mode !== "unlimited" && current && <div className={"stock-track" + ((product.available_stock ?? 0) <= threshold ? " stock-track--low" : "")} aria-label={copy.itemCount + ": " + (product.available_stock ?? 0)}><span style={{ width: stockPercent + "%" }} /></div>}
      </div>
    </motion.article>
  );
}
