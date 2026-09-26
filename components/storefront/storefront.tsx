"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion, useScroll } from "framer-motion";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUpRight, Gamepad2, Menu, Search, ShoppingBag, X } from "lucide-react";
import { BrandMark } from "@/components/brand/brand-mark";
import { LiquidLighting } from "@/components/design/liquid-lighting";
import { CategoryCarousel } from "@/components/storefront/category-carousel";
import { RevealSection } from "@/components/motion/reveal-section";
import { getMessages } from "@/lib/i18n";
import { fetchStorefrontData } from "@/lib/queries/storefront";
import { useBundleStore } from "@/lib/bundle/store";
import { directionFor, type Locale } from "@/types/locale";
import type { StoreProduct } from "@/types/storefront";
import { useQuery } from "@tanstack/react-query";

function PreviewTile({ product, locale, index }: { product: StoreProduct; locale: Locale; index: number }) {
  const title = locale === "ar" ? product.name_ar : product.name_en;
  const tagline = locale === "ar" ? product.tagline_ar : product.tagline_en;
  return <motion.article className="preview-tile" initial={{ opacity: 0, y: 36, scale: .98 }} whileInView={{ opacity: 1, y: 0, scale: 1 }} viewport={{ once: true, amount: .15 }} transition={{ duration: .65, delay: Math.min(index * .09, .35), ease: [.2,.84,.28,1] }}>
    <Link href="/catalog" className="preview-tile-art" style={{ "--tile-tint": product.label_color } as React.CSSProperties}>
      {product.cover_url ? <Image src={product.cover_url} alt="" fill sizes="(max-width: 700px) 44vw, 260px" /> : <><span className="preview-tile-halo" /><span className="preview-tile-orbit" /><span className="preview-tile-core" /></>}
      <span className="preview-tile-platform">{product.platform}</span><span className="preview-tile-arrow"><ArrowUpRight size={17} /></span>
    </Link>
    <div className="preview-tile-copy"><p>{product.is_preorder ? (locale === "ar" ? "طلب مسبق" : "PRE-ORDER") : (locale === "ar" ? "اختيار من المتجر" : "FROM THE STORE")}</p><h3>{title}</h3><span>{tagline}</span></div>
  </motion.article>;
}

export function Storefront() {
  const [locale, setLocale] = useState<Locale>("ar");
  const [menuOpen, setMenuOpen] = useState(false);
  const [bundleOpen, setBundleOpen] = useState(false);
  const query = useQuery({ queryKey: ["storefront"], queryFn: fetchStorefrontData, refetchInterval: 60_000 });
  const items = useBundleStore((state) => state.items);
  const remove = useBundleStore((state) => state.remove);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const copy = useMemo(() => getMessages(locale), [locale]);
  const dir = directionFor(locale);
  const data = query.data;
  const liveProducts = data?.mode === "live" ? data.products : [];
  const featured = liveProducts.filter((product) => product.is_featured).slice(0, 4);
  const shownFeatured = featured.length ? featured : liveProducts.slice(0, 4);
  const bundleCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const Arrow = locale === "ar" ? ArrowLeft : ArrowRight;

  useEffect(() => {
    void useBundleStore.persist.rehydrate();
    const savedLocale = localStorage.getItem("7zma.locale");
    const currentLocale = savedLocale === "en" || savedLocale === "ar" ? savedLocale : data?.settings?.default_language ?? "ar";
    setLocale(currentLocale);
  }, [data?.settings?.default_language]);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = dir;
    localStorage.setItem("7zma.locale", locale);
  }, [dir, locale]);

  return <main className="site-shell home-shell" dir={dir}>
    <LiquidLighting />
    <div className="motion-backdrop" aria-hidden="true"><motion.div className="backdrop-light backdrop-light--a" animate={reduceMotion ? undefined : { x: [0, 48, -18, 0], y: [0, 35, 58, 0], scale: [1, 1.14, .92, 1] }} transition={{ duration: 24, ease: "easeInOut", repeat: Infinity }} /><motion.div className="backdrop-light backdrop-light--b" animate={reduceMotion ? undefined : { x: [0, -42, 20, 0], y: [0, -26, -60, 0], scale: [1, .9, 1.12, 1] }} transition={{ duration: 29, ease: "easeInOut", repeat: Infinity }} /><div className="backdrop-lines" /><div className="backdrop-grain" /></div>
    <div className="scroll-progress" aria-hidden="true"><motion.div style={{ scaleX: scrollYProgress, transformOrigin: "0% 50%" }} /></div>

    <header className="topbar-wrap">
      <nav className="topbar" aria-label={copy.mainNavigation}>
        <Link href="/" className="brand-link" aria-label="7ZMA"><BrandMark /></Link>
        <div className={`desktop-links${menuOpen ? " is-open" : ""}`}>
          <Link className="nav-link nav-link-active" href="/catalog"><span>{copy.navStore}</span><motion.i layoutId="nav-active" /></Link>
          <Link className="nav-link" href="/catalog#categories">{copy.navCategories}</Link>
          <Link className="nav-link" href="/track">{copy.navTrack}</Link>
        </div>
        <div className="topbar-actions">
          <div className="locale-toggle" role="group" aria-label={copy.chooseLanguage}>
            {(["ar", "en"] as const).map((next) => <button key={next} aria-pressed={locale === next} onClick={() => setLocale(next)}>{next === "ar" ? copy.languageAr : copy.languageEn}</button>)}
          </div>
          <Link className="icon-button account-button" href="/account" aria-label={copy.navAccount}><Image src="/7zma-avatar.jpg" alt="" width={34} height={34} /></Link>
          <motion.button className="bundle-button" onClick={() => setBundleOpen(true)} aria-label={`${copy.navBundle}, ${bundleCount}`} whileTap={{ scale: .92 }}><ShoppingBag size={17} /><span>{copy.navBundle}</span><motion.span key={bundleCount} className="bundle-count" initial={{ scale: .5 }} animate={{ scale: 1 }}>{bundleCount}</motion.span></motion.button>
          <button className="icon-button menu-button" aria-label={menuOpen ? copy.closeMenu : copy.openMenu} onClick={() => setMenuOpen((open) => !open)}>{menuOpen ? <X size={20} /> : <Menu size={20} />}</button>
        </div>
      </nav>
      <AnimatePresence>{menuOpen && <motion.div className="mobile-menu" initial={{ opacity: 0, y: -12, scale: .98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8, scale: .98 }} transition={{ duration: .24 }}><Link href="/catalog" onClick={() => setMenuOpen(false)}>{copy.navStore}</Link><Link href="/catalog#categories" onClick={() => setMenuOpen(false)}>{copy.navCategories}</Link><Link href="/track" onClick={() => setMenuOpen(false)}>{copy.navTrack}</Link><Link href="/account" onClick={() => setMenuOpen(false)}>{copy.navAccount}</Link></motion.div>}</AnimatePresence>
    </header>

    <section className="hero section-frame" id="home">
      <div className="hero-copy">
        <motion.div className="eyebrow" initial={false} animate={{ opacity: 1, y: 0 }} transition={{ duration: .7, delay: .1 }}><span className="eyebrow-line" />{copy.heroEyebrow}</motion.div>
        <motion.h1 initial={false} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} transition={{ duration: .9, delay: .23, ease: [.2,.84,.28,1] }}>{copy.heroTitle}<br /><span>{copy.heroTitleAccent}</span></motion.h1>
        <motion.p className="hero-description" initial={false} animate={{ opacity: 1, y: 0 }} transition={{ duration: .7, delay: .42 }}>{copy.heroBody}</motion.p>
        <motion.div className="hero-actions" initial={false} animate={{ opacity: 1, y: 0 }} transition={{ duration: .7, delay: .55 }}>
          <Link href="/catalog" className="button-primary liquid-button"><span>{copy.shopNow}</span><Arrow size={18} /></Link>
          <Link href="/catalog" className="button-secondary"><Search size={17} /><span>{locale === "ar" ? "ابحث عن لعبتك" : "Find your next game"}</span></Link>
        </motion.div>
        <motion.div className="hero-meta" initial={false} animate={{ opacity: 1 }} transition={{ delay: .9 }}><span className="meta-dot" />{copy.heroFootnote}<span className="meta-divider" /><span className="meta-edition">{copy.edition}</span></motion.div>
      </div>
      <CategoryCarousel categories={data?.categories ?? []} locale={locale} />
      <motion.div className="hero-scroll" animate={reduceMotion ? undefined : { y: [0, 7, 0] }} transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}><span>{copy.scrollExplore}</span><ArrowDown size={15} /></motion.div>
    </section>

    <div className="ticker" aria-label={copy.tagline}><motion.div className="ticker-track" animate={reduceMotion ? undefined : { x: [0, -560] }} transition={{ duration: 21, ease: "linear", repeat: Infinity }}>{Array.from({ length: 6 }, (_, index) => <span key={index}><i>✳</i>{copy.tagline}<b>·</b>7ZMA <i>✳</i>{copy.tagline}<b>·</b>7ZMA</span>)}</motion.div></div>

    <RevealSection className="preview-section section-frame" id="preview" variant="drift">
      <motion.div className="preview-heading" initial={reduceMotion ? false : { opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: .35 }} transition={{ duration: .7, ease: [.2,.84,.28,1] }}>
        <div><div className="eyebrow"><span className="eyebrow-line" />{copy.previewEyebrow}</div><h2>{copy.previewTitle}</h2><p>{copy.previewBody}</p></div>
        <Link href="/catalog" className="preview-all"><span>{copy.browseStore}</span><ArrowUpRight size={18} /></Link>
      </motion.div>
      {query.isLoading ? <div className="preview-loading"><motion.span animate={reduceMotion ? undefined : { scale: [1, 1.45, 1], opacity: [.4, 1, .4] }} transition={{ duration: 1.35, repeat: Infinity }} />{copy.storeLoading}</div>
        : query.isError ? <div className="preview-empty" role="alert">{copy.storeError}</div>
        : shownFeatured.length ? <div className="preview-grid">{shownFeatured.map((product: StoreProduct, index) => <PreviewTile key={product.id} product={product} locale={locale} index={index} />)}</div>
        : <div className="preview-empty"><span className="preview-empty-glyph"><Gamepad2 size={23} /></span><p>{data?.mode === "preview" ? copy.emptyPreview : copy.noProducts}</p><Link href="/catalog">{copy.browseStore}<ArrowUpRight size={17} /></Link></div>}
      <motion.div className="preview-cta" initial={reduceMotion ? false : { opacity: 0, scale: .96 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: .65 }}><span>{locale === "ar" ? "تجربة كاملة بانتظارك" : "The full collection is waiting"}</span><Link href="/catalog">{copy.browseStore}<Arrow size={17} /></Link></motion.div>
    </RevealSection>

    <RevealSection className="site-footer section-frame" variant="scale">
      <Link href="/" className="footer-brand"><BrandMark compact /></Link><p>{copy.footerLine}</p>
      <div className="footer-links"><Link href="/catalog">{copy.navStore}</Link><Link href="/track">{copy.navTrack}</Link><Link href="/account">{copy.navAccount}</Link><Link href="/terms">{locale === "ar" ? "الشروط" : "Terms"}</Link><Link href="/privacy">{locale === "ar" ? "الخصوصية" : "Privacy"}</Link><Link href="/refunds">{locale === "ar" ? "التسليم والاسترداد" : "Delivery & refunds"}</Link><Link href="/contact">{locale === "ar" ? "التواصل" : "Contact"}</Link></div><span className="footer-copyright">© 7ZMA · {new Date().getFullYear()}</span>
    </RevealSection>

    <nav className="mobile-tabs" aria-label={copy.quickNavigation}><Link href="/" aria-current="page"><span className="mobile-tab-icon">⌂</span><span>{copy.mobileHome}</span></Link><Link href="/catalog"><Gamepad2 size={18} /><span>{copy.navStore}</span></Link><button onClick={() => setBundleOpen(true)}><ShoppingBag size={18} /><span>{copy.navBundle}</span><i>{bundleCount}</i></button><Link href="/track"><ArrowDown size={17} /><span>{copy.mobileTrack}</span></Link><Link href="/account"><Image src="/7zma-avatar.jpg" alt="" width={23} height={23} /><span>{copy.navAccount}</span></Link></nav>

    <AnimatePresence>{bundleOpen && <motion.div className="drawer-backdrop" onClick={() => setBundleOpen(false)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><motion.aside className="bundle-drawer" role="dialog" aria-modal="true" aria-label={copy.navBundle} onClick={(event) => event.stopPropagation()} initial={{ x: dir === "rtl" ? -36 : 36, opacity: .65 }} animate={{ x: 0, opacity: 1 }} exit={{ x: dir === "rtl" ? -24 : 24, opacity: 0 }} transition={{ type: "spring", stiffness: 260, damping: 28 }}>
      <div className="drawer-heading"><div><span className="eyebrow"><span className="eyebrow-line" />7ZMA</span><h2>{copy.navBundle}</h2></div><button className="icon-button" onClick={() => setBundleOpen(false)} aria-label={copy.close}><X size={20} /></button></div>
      {!bundleCount ? <div className="bundle-empty"><div className="empty-orbit"><ShoppingBag size={23} /></div><p>{copy.bundleEmpty}</p><Link href="/catalog" className="button-primary liquid-button" onClick={() => setBundleOpen(false)}><span>{copy.shopNow}</span><Arrow size={17} /></Link></div> : <div className="bundle-items">{items.map((item) => { const product = liveProducts.find((entry) => entry.id === item.productId); const title = product ? (locale === "ar" ? product.name_ar : product.name_en) : copy.bundleItemUnavailable; return <motion.div className="bundle-item" key={item.productId} layout initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }}><span className="bundle-thumb" /><span>{title}<small> × {item.quantity}</small></span><button className="icon-button remove-item" onClick={() => remove(item.productId)} aria-label={`${copy.remove}: ${title}`}><X size={15} /></button></motion.div>; })}<p className="sample-note">{copy.bundleRevalidated}</p><Link className="button-primary liquid-button bundle-checkout-link" href="/checkout" onClick={() => setBundleOpen(false)}><span>{locale === "ar" ? "متابعة إلى الطلب" : "Continue to checkout"}</span><Arrow size={17} /></Link></div>}
    </motion.aside></motion.div>}</AnimatePresence>
  </main>;
}
