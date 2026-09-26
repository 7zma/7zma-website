"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight, ArrowUpRight, Check, ChevronDown, Gamepad2, Search, SlidersHorizontal, X } from "lucide-react";
import { ProductCard } from "@/components/storefront/product-card";
import { fetchStorefrontData } from "@/lib/queries/storefront";
import { useBundleStore } from "@/lib/bundle/store";
import { getMessages } from "@/lib/i18n";
import { matchesStoreSearch } from "@/lib/search/arabic";
import type { Locale } from "@/types/locale";
import type { ManualPrice, CurrencyDefinition } from "@/lib/money";
import type { StoreProduct } from "@/types/storefront";
import { useQuery } from "@tanstack/react-query";

type SortOrder = "featured" | "low" | "high" | "name";
const platformNames: Record<string, { ar: string; en: string }> = {
  ps5: { ar: "PlayStation 5", en: "PlayStation 5" }, ps4: { ar: "PlayStation 4", en: "PlayStation 4" }, xbox_series: { ar: "Xbox Series", en: "Xbox Series" }, xbox_one: { ar: "Xbox One", en: "Xbox One" }, pc_steam: { ar: "PC / Steam", en: "PC / Steam" }, pc_other: { ar: "PC", en: "PC" }, switch: { ar: "Nintendo Switch", en: "Nintendo Switch" }, switch2: { ar: "Nintendo Switch 2", en: "Nintendo Switch 2" },
};

export function Catalog() {
  const [locale, setLocale] = useState<Locale>("ar");
  const [currency, setCurrency] = useState("");
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [platform, setPlatform] = useState("");
  const [sort, setSort] = useState<SortOrder>("featured");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const searchInput = useRef<HTMLInputElement>(null);
  const data = useQuery({ queryKey: ["storefront"], queryFn: fetchStorefrontData, refetchInterval: 60_000 });
  const add = useBundleStore((state) => state.add);
  const items = useBundleStore((state) => state.items);
  const reduceMotion = useReducedMotion();
  const copy = useMemo(() => getMessages(locale), [locale]);
  const live = data.data;
  const products = live?.mode === "live" ? live.products : [];
  const prices = useMemo(() => {
    const map = new Map<string, ManualPrice>();
    for (const price of live?.prices ?? []) map.set(`${price.product_id}:${price.currency_code}`, { price_minor: price.price_minor, compare_at_price_minor: price.compare_at_price_minor });
    return map;
  }, [live?.prices]);
  const currencies = useMemo(() => new Map<string, CurrencyDefinition>((live?.currencies ?? []).map((item) => [item.code, item])), [live?.currencies]);
  const selectedCurrency = currency || live?.settings?.default_currency || live?.currencies[0]?.code || "";
  const localeCopy = locale === "ar";
  const Arrow = localeCopy ? ArrowLeft : ArrowRight;
  const platformValues = useMemo(() => [...new Set(products.map((product) => product.platform))], [products]);

  useEffect(() => {
    const savedLocale = localStorage.getItem("7zma.locale");
    const next = savedLocale === "en" ? "en" : "ar";
    setLocale(next);
    setCurrency(localStorage.getItem("7zma.currency") ?? "");
    document.documentElement.lang = next;
    document.documentElement.dir = next === "ar" ? "rtl" : "ltr";
  }, []);

  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchInput.current?.focus();
      }
      if (event.key === "Escape" && document.activeElement === searchInput.current) searchInput.current?.blur();
    };
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  }, []);

  const filtered = useMemo(() => {
    const result = products.filter((product) => {
      const matchesCategory = !categoryId || product.category_id === categoryId;
      const matchesPlatform = !platform || product.platform === platform;
      const title = localeCopy ? product.name_ar : product.name_en;
      const description = localeCopy ? product.description_ar : product.description_en;
      const tagline = localeCopy ? product.tagline_ar : product.tagline_en;
      return matchesCategory && matchesPlatform && matchesStoreSearch(search, title, description, tagline, product.platform, ...product.tags);
    });
    if (sort === "name") result.sort((a, b) => (localeCopy ? a.name_ar : a.name_en).localeCompare(localeCopy ? b.name_ar : b.name_en, localeCopy ? "ar" : "en"));
    if (sort === "low" || sort === "high") result.sort((a, b) => {
      const price = (product: StoreProduct) => (prices.get(`${product.id}:${selectedCurrency}`) ?? prices.get(`${product.id}:${live?.settings?.default_currency ?? ""}`))?.price_minor ?? Number.MAX_SAFE_INTEGER;
      return sort === "low" ? price(a) - price(b) : price(b) - price(a);
    });
    if (sort === "featured") result.sort((a, b) => Number(b.is_featured) - Number(a.is_featured) || a.sort_order - b.sort_order);
    return result;
  }, [categoryId, live?.settings?.default_currency, localeCopy, platform, prices, products, search, selectedCurrency, sort]);

  const clearFilters = () => { setSearch(""); setCategoryId(""); setPlatform(""); setSort("featured"); };
  const activeFilterCount = Number(Boolean(categoryId)) + Number(Boolean(platform));

  return <main className="catalog-page" dir={localeCopy ? "rtl" : "ltr"}>
    <div className="catalog-atmosphere" aria-hidden="true"><motion.span animate={reduceMotion ? undefined : { x: [0, 48, 0], y: [0, 24, 0] }} transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }} /><motion.span animate={reduceMotion ? undefined : { x: [0, -34, 0], y: [0, -30, 0] }} transition={{ duration: 23, repeat: Infinity, ease: "easeInOut" }} /></div>
    <header className="catalog-topbar"><Link href="/" className="catalog-brand"><Image src="/7zma-avatar.jpg" alt="" width={40} height={40} /><span>7ZMA<small>{localeCopy ? "حزمة" : "BUNDLE UP. LEVEL UP."}</small></span></Link><nav aria-label={copy.mainNavigation}><Link href="/" className="catalog-nav-link">{localeCopy ? "الرئيسية" : "Home"}</Link><span className="catalog-nav-active">{copy.navStore}</span><Link href="/track" className="catalog-nav-link">{copy.navTrack}</Link></nav><div className="catalog-top-actions">{(live?.currencies ?? []).length > 0 && <label className="catalog-currency-select"><span>{localeCopy ? "العملة" : "Currency"}</span><select aria-label={copy.currencyLabel} value={selectedCurrency} onChange={(event) => { setCurrency(event.target.value); localStorage.setItem("7zma.currency", event.target.value); }}>{live?.currencies.map((item) => <option value={item.code} key={item.code}>{localeCopy ? item.symbol_ar : item.symbol_en} · {item.code}</option>)}</select></label>}<button type="button" onClick={() => { const next = localeCopy ? "en" : "ar"; setLocale(next); localStorage.setItem("7zma.locale", next); document.documentElement.lang = next; document.documentElement.dir = next === "ar" ? "rtl" : "ltr"; }}>{localeCopy ? "English" : "عربي"}</button><Link href="/checkout" className="catalog-cart" aria-label={`${copy.navBundle}: ${items.length}`}><Gamepad2 size={17} /><span>{copy.navBundle}</span><i>{items.reduce((sum,item)=>sum+item.quantity,0)}</i></Link></div></header>

    <section className="catalog-hero"><motion.div initial={false} animate={{ opacity: 1, y: 0 }} transition={{ duration: .72 }}><p className="catalog-kicker"><span />7ZMA DIGITAL STORE <span>—</span> {localeCopy ? "اكتشف مجموعتك" : "THE COLLECTION"}</p><h1>{localeCopy ? <>مساحتك<br /><span>للعب أكثر.</span></> : <>Your next<br /><span>world awaits.</span></>}</h1><p className="catalog-intro">{localeCopy ? "ألعاب وتجارب رقمية مختارة. ابحث، صفِّ النتائج، واعثر على اختيارك." : "Digital games and experiences, gathered in one place. Search, explore, and find your next pick."}</p></motion.div><motion.div className="catalog-hero-art" initial={false} animate={{ opacity: 1, scale: 1, rotate: 0 }} transition={{ duration: 1.1, type: "spring", stiffness: 65, damping: 16 }}><motion.div className="catalog-hero-orbit" animate={reduceMotion ? undefined : { rotate: 360 }} transition={{ duration: 46, repeat: Infinity, ease: "linear" }} /><Image src="/7zma-avatar.jpg" alt="7ZMA" width={220} height={220} priority /><span>PLAY<br />YOUR<br />WAY</span></motion.div><div className="catalog-hero-stats"><span><b>{String(products.length).padStart(2,"0")}</b>{localeCopy ? "منتجات متاحة" : "AVAILABLE PICKS"}</span><span><b>{String(platformValues.length).padStart(2,"0")}</b>{localeCopy ? "منصات" : "PLATFORMS"}</span></div></section>

    <section className="catalog-browser" id="categories">
      <div className="catalog-browser-heading"><div><p className="catalog-kicker"><span />{localeCopy ? "مكتبة الألعاب" : "THE LIBRARY"}</p><h2>{localeCopy ? "تصفّح كل شيء" : "Browse everything"}</h2></div><span className="catalog-result-count"><b>{filtered.length}</b> {copy.resultsCount}</span></div>
      <div className="catalog-searchbar"><Search size={21} /><input ref={searchInput} aria-label={copy.searchLabel} placeholder={copy.searchPlaceholder} value={search} onChange={(event) => setSearch(event.target.value)} /><AnimatePresence>{search && <motion.button type="button" aria-label={localeCopy ? "مسح البحث" : "Clear search"} initial={{ opacity: 0, scale: .6 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: .6 }} onClick={() => setSearch("")}><X size={17} /></motion.button>}</AnimatePresence><kbd>Ctrl K</kbd></div>
      <div className="catalog-filters-row"><div className="catalog-filter-scroll"><button className={!platform ? "catalog-filter is-active" : "catalog-filter"} onClick={() => setPlatform("")}>{copy.filterAll}</button>{platformValues.map((value) => <button key={value} className={platform === value ? "catalog-filter is-active" : "catalog-filter"} onClick={() => setPlatform(platform === value ? "" : value)}><span className="catalog-filter-dot" />{(platformNames[value] ?? { ar: value, en: value })[locale]}</button>)}</div><button className="catalog-filter-toggle" onClick={() => setFiltersOpen((open) => !open)}><SlidersHorizontal size={16} />{localeCopy ? "التصنيفات" : "Categories"}{activeFilterCount > 0 && <i>{activeFilterCount}</i>}<ChevronDown className={filtersOpen ? "is-rotated" : ""} size={15} /></button><label className="catalog-sort"><span>{localeCopy ? "ترتيب" : "Sort"}</span><select value={sort} onChange={(event) => setSort(event.target.value as SortOrder)}><option value="featured">{copy.sortFeatured}</option><option value="low">{copy.sortPriceLow}</option><option value="high">{copy.sortPriceHigh}</option><option value="name">{copy.sortName}</option></select></label></div>
      <AnimatePresence initial={false}>{filtersOpen && <motion.div className="catalog-category-panel" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: .32, ease: [.2,.84,.28,1] }}><div className="catalog-category-inner"><button className={!categoryId ? "category-option is-active" : "category-option"} onClick={() => setCategoryId("")}>{localeCopy ? "كل الفئات" : "All categories"}{!categoryId && <Check size={15} />}</button>{(live?.categories ?? []).map((category) => <button key={category.id} className={categoryId === category.id ? "category-option is-active" : "category-option"} onClick={() => setCategoryId(categoryId === category.id ? "" : category.id)}>{localeCopy ? category.name_ar : category.name_en}{categoryId === category.id && <Check size={15} />}</button>)}</div></motion.div>}</AnimatePresence>
      <div className="catalog-active-filters">{categoryId && <button onClick={() => setCategoryId("")}>{live?.categories.find((entry) => entry.id === categoryId)?.[localeCopy ? "name_ar" : "name_en"]}<X size={14} /></button>}{platform && <button onClick={() => setPlatform("")}>{platformNames[platform]?.[locale] ?? platform}<X size={14} /></button>}{(search || categoryId || platform) && <button className="catalog-clear" onClick={clearFilters}>{localeCopy ? "مسح الكل" : "Clear all"}</button>}</div>
      {data.isLoading ? <motion.div className="catalog-loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }}><motion.span animate={reduceMotion ? undefined : { rotate: 360 }} transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }} /><p>{copy.storeLoading}</p></motion.div> : data.isError ? <div className="catalog-empty" role="alert"><h2>{copy.storeError}</h2></div> : live?.mode === "preview" ? <motion.div className="catalog-empty" initial={false} animate={{ opacity: 1, y: 0 }}><span className="catalog-empty-icon"><Gamepad2 size={24} /></span><h2>{localeCopy ? "المتجر يستعد للانطلاق" : "The store is getting ready"}</h2><p>{localeCopy ? "اربط قاعدة بيانات المتجر وأضف منتجاتك المنشورة لعرض الكتالوج هنا." : "Connect your store database and publish products to see the catalog here."}</p></motion.div> : filtered.length ? <motion.div layout className="catalog-grid"><AnimatePresence mode="popLayout">{filtered.map((product, index) => <ProductCard key={product.id} product={product} prices={new Map([...prices].filter(([key]) => key.startsWith(`${product.id}:`)).map(([key, value]) => [key.split(":")[1], value]))} currencies={currencies} currency={selectedCurrency} defaultCurrency={live?.settings?.default_currency ?? ""} locale={locale} copy={copy} lowStockThreshold={live?.settings?.low_stock_threshold ?? 3} add={add} index={index} />)}</AnimatePresence></motion.div> : <motion.div className="catalog-empty" initial={{ opacity: 0, scale: .97 }} animate={{ opacity: 1, scale: 1 }}><span className="catalog-empty-icon"><Search size={22} /></span><h2>{copy.noSearchResults}</h2><button onClick={clearFilters}>{localeCopy ? "عرض كل المنتجات" : "Show all products"}<Arrow size={16} /></button></motion.div>}
    </section>
    <footer className="catalog-footer"><Link href="/" className="catalog-brand"><Image src="/7zma-avatar.jpg" alt="" width={36} height={36} /><span>7ZMA<small>Bundle up. Level up.</small></span></Link><p>© 7ZMA · {new Date().getFullYear()}</p><Link href="/">{localeCopy ? "العودة للرئيسية" : "Back to home"}<ArrowUpRight size={15} /></Link></footer>
  </main>;
}
