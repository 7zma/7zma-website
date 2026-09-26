"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight } from "lucide-react";
import type { StoreCategory } from "@/types/storefront";
import type { Locale } from "@/types/locale";

const INTERVAL = 5500;

export function CategoryCarousel({ categories, locale }: { categories: StoreCategory[]; locale: Locale }) {
  const reduceMotion = useReducedMotion();
  const slides = useMemo(() => categories.filter((category) => category.cover_url).sort((a, b) => a.sort_order - b.sort_order), [categories]);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const current = slides[index];
  const next = locale === "ar" ? ArrowLeft : ArrowRight;

  useEffect(() => {
    if (paused || reduceMotion || slides.length < 2) return;
    const timer = window.setInterval(() => setIndex((value) => (value + 1) % slides.length), INTERVAL);
    return () => window.clearInterval(timer);
  }, [paused, reduceMotion, slides.length]);

  useEffect(() => { if (index >= slides.length) setIndex(0); }, [index, slides.length]);

  if (!current) return <div className="category-carousel-empty" aria-label={locale === "ar" ? "صور التصنيفات ستظهر هنا" : "Category image previews will appear here"}><span>7ZMA</span><small>{locale === "ar" ? "أضف صور التصنيفات من لوحة الإدارة" : "Add category images in the admin panel"}</small></div>;

  const title = locale === "ar" ? current.name_ar : current.name_en;
  return <div className="category-carousel" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocus={() => setPaused(true)} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false); }} aria-roledescription="carousel" aria-label={locale === "ar" ? "معاينة تصنيفات المتجر" : "Store category previews"}>
    <AnimatePresence mode="wait">
      <motion.div key={current.id} className="category-slide" initial={reduceMotion ? false : { opacity: 0, x: locale === "ar" ? 36 : -36, scale: .96 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={reduceMotion ? undefined : { opacity: 0, x: locale === "ar" ? -28 : 28, scale: .98 }} transition={{ duration: reduceMotion ? 0 : .7, ease: [.22, .75, .25, 1] }}>
        <Link href="/catalog#categories" className="category-slide-image" style={{ "--category-accent": current.accent_color } as React.CSSProperties} aria-label={`${locale === "ar" ? "استكشف" : "Explore"} ${title}`}>
          <Image src={current.cover_url!} alt={title} fill sizes="(max-width: 720px) 90vw, 48vw" priority={index === 0} />
          <span className="category-slide-shade" />
          <span className="category-slide-copy"><small>{locale === "ar" ? "اكتشف التصنيف" : "EXPLORE CATEGORY"}</small><strong>{title}</strong><i><ArrowRight size={17} /></i></span>
        </Link>
      </motion.div>
    </AnimatePresence>
    {slides.length > 1 && <div className="category-carousel-controls"><div className="category-carousel-dots" role="group" aria-label={locale === "ar" ? "اختيار التصنيف" : "Choose category"}>{slides.map((slide, dot) => <button key={slide.id} type="button" aria-label={`${dot + 1}: ${locale === "ar" ? slide.name_ar : slide.name_en}`} aria-current={dot === index} onClick={() => setIndex(dot)}><span /></button>)}</div><div className="category-carousel-arrows"><button type="button" aria-label={locale === "ar" ? "السابق" : "Previous"} onClick={() => setIndex((index - 1 + slides.length) % slides.length)}><ArrowLeft size={15} /></button><button type="button" aria-label={locale === "ar" ? "التالي" : "Next"} onClick={() => setIndex((index + 1) % slides.length)}><ArrowRight size={15} /></button></div></div>}
    {slides.length > 1 && !reduceMotion && <motion.div key={`${current.id}-timer`} className="category-carousel-timer" initial={{ scaleX: 0 }} animate={{ scaleX: paused ? undefined : 1 }} transition={{ duration: INTERVAL / 1000, ease: "linear" }} />}
    <span className="category-carousel-index">{String(index + 1).padStart(2, "0")} <i>/</i> {String(slides.length).padStart(2, "0")}</span>
    <span className="category-carousel-next" aria-hidden="true">{next({ size: 17 })}</span>
  </div>;
}
