"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, ShieldCheck, Trash2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { fetchStorefrontData } from "@/lib/queries/storefront";
import { useBundleStore } from "@/lib/bundle/store";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { TurnstileWidget } from "@/components/security/turnstile-widget";
import type { CurrencyDefinition, ManualPrice } from "@/lib/money";
import type { Locale } from "@/types/locale";
import { useEffect } from "react";

type CouponResponse = { valid?: boolean; discount_minor?: number; message?: string; reason?: string };
type OrderResponse = { order?: { order_number: string }; trackingUrl?: string; error?: string };

export default function CheckoutPage() {
  const [locale, setLocale] = useState<Locale>("ar");
  const [currency, setCurrency] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [coupon, setCoupon] = useState("");
  const [couponResult, setCouponResult] = useState<CouponResponse | null>(null);
  const [paymentMethodId, setPaymentMethodId] = useState("");
  const [token, setToken] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState<OrderResponse | null>(null);
  const query = useQuery({ queryKey: ["storefront"], queryFn: fetchStorefrontData });
  const items = useBundleStore((state) => state.items);
  const remove = useBundleStore((state) => state.remove);
  const clear = useBundleStore((state) => state.clear);
  const data = query.data;

  useEffect(() => {
    const savedLocale = localStorage.getItem("7zma.locale");
    const nextLocale = savedLocale === "en" ? "en" : "ar";
    setLocale(nextLocale);
    setCurrency(localStorage.getItem("7zma.currency") ?? "");
    document.documentElement.lang = nextLocale;
    document.documentElement.dir = nextLocale === "ar" ? "rtl" : "ltr";
  }, []);

  const text = useMemo(() => locale === "ar" ? {
    back: "العودة للمتجر", title: "أكمل طلبك", subtitle: "راجع حزمتك وأرسل طلبك للتأكيد اليدوي.", bundle: "حزمتك", empty: "حزمتك فارغة حالياً.", browse: "استكشف المتجر", customer: "بيانات التواصل", fullName: "الاسم الكامل", phone: "رقم واتساب بصيغة دولية", note: "ملاحظة للمتجر (اختياري)", currency: "العملة", payment: "طريقة الدفع", none: "يحددها المتجر لاحقاً", coupon: "رمز الخصم", apply: "تحقق من الرمز", applied: "تم التحقق من الرمز. يحسب الخصم النهائي عند إرسال الطلب.", invalid: "تعذر تطبيق الرمز على هذه الحزمة.", consent: "أوافق على شروط الاستخدام وسياسة الخصوصية.", submit: "إرسال الطلب للتأكيد", working: "جار إرسال الطلب…", captcha: "أكمل التحقق قبل إرسال الطلب.", connect: "المتجر غير متصل بعد. لا يمكن إرسال طلب حقيقي حتى يكتمل الإعداد.", failed: "تعذر إرسال الطلب. راجع البيانات وحاول مرة أخرى.", security: "لا يتم تحصيل أي مبلغ عبر هذه الصفحة. تأكيد الدفع يتم يدوياً بعد مراجعة الطلب.", success: "تم استلام طلبك", tracking: "تتبّع طلبك", remove: "إزالة", price: "السعر", noPrice: "السعر غير متاح", policy: "تخضع الصفحات القانونية للمراجعة قبل النشر.", couponPlaceholder: "أدخل الرمز", order: "رقم الطلب", emptyNote: "أضف منتجاً واحداً على الأقل للمتابعة.", choices: "اختر طريقة الدفع إن كانت متاحة.",
  } : {
    back: "Back to store", title: "Complete your order", subtitle: "Review your bundle and send an order for manual confirmation.", bundle: "Your bundle", empty: "Your bundle is empty.", browse: "Explore the store", customer: "Contact details", fullName: "Full name", phone: "WhatsApp number in international format", note: "Note for the store (optional)", currency: "Currency", payment: "Payment method", none: "Set by the store later", coupon: "Discount code", apply: "Check code", applied: "Code checked. Final discount is calculated when you submit.", invalid: "This code could not be applied to this bundle.", consent: "I agree to the Terms and Privacy Policy.", submit: "Send order for confirmation", working: "Sending order…", captcha: "Complete verification before submitting.", connect: "The store is not connected yet. A real order cannot be sent until setup is complete.", failed: "Could not send the order. Check your details and try again.", security: "This page does not collect payment. Payment is confirmed manually after your order is reviewed.", success: "Your order was received", tracking: "Track your order", remove: "Remove", price: "Price", noPrice: "Price unavailable", policy: "Legal pages are subject to review before publishing.", couponPlaceholder: "Enter code", order: "Order number", emptyNote: "Add at least one item to continue.", choices: "Choose a payment method if available.",
  }, [locale]);

  const selectedCurrency = currency || data?.settings?.default_currency || data?.currencies[0]?.code || "";
  const currencyMap = new Map<string, CurrencyDefinition>((data?.currencies ?? []).map((c) => [c.code, c]));
  const productMap = new Map((data?.products ?? []).map((p) => [p.id, p]));
  const priceMap = useMemo(() => {
    const map = new Map<string, ManualPrice>();
    for (const price of data?.prices ?? []) map.set(`${price.product_id}:${price.currency_code}`, { price_minor: price.price_minor, compare_at_price_minor: price.compare_at_price_minor });
    return map;
  }, [data?.prices]);
  const subtotal = items.reduce((sum, item) => {
    const selected = priceMap.get(`${item.productId}:${selectedCurrency}`);
    const fallback = priceMap.get(`${item.productId}:${data?.settings?.default_currency ?? ""}`);
    const price = selected ?? fallback;
    return sum + (price ? price.price_minor * item.quantity : 0);
  }, 0);
  const money = (minor: number) => {
    const c = currencyMap.get(selectedCurrency);
    const factor = 10 ** (c?.decimals ?? 2);
    const amount = (minor / factor).toLocaleString(locale === "ar" ? "ar-u-nu-latn" : "en", { minimumFractionDigits: c?.decimals ?? 2, maximumFractionDigits: c?.decimals ?? 2 });
    return locale === "ar" ? `${amount} ${c?.symbol_ar ?? selectedCurrency}` : `${c?.symbol_en ?? selectedCurrency} ${amount}`;
  };

  async function checkCoupon() {
    setCouponResult(null);
    if (!coupon.trim() || !selectedCurrency || !items.length) return;
    try {
      const response = await fetch("/api/coupons/validate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: coupon.trim(), currencyCode: selectedCurrency, items }) });
      const result = await response.json() as CouponResponse;
      setCouponResult(result);
    } catch { setCouponResult({ valid: false }); }
  }

  async function submitOrder(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    if (data?.mode !== "live") { setMessage(text.connect); return; }
    if (!token) { setMessage(text.captcha); return; }
    if (!consent) return;
    if (data.settings?.require_login_to_order) {
      const client = createSupabaseBrowserClient();
      const { data: { user } } = client ? await client.auth.getUser() : { data: { user: null } };
      if (!user) { setMessage(locale === "ar" ? "يتطلب هذا المتجر تسجيل الدخول لإكمال الطلب." : "Sign in is required to order from this store."); return; }
    }
    setBusy(true);
    try {
      const response = await fetch("/api/orders/create", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, phone: phone.trim(), note, currencyCode: selectedCurrency, items, couponCode: coupon.trim() || null, paymentMethodId: paymentMethodId || null, turnstileToken: token }) });
      const result = await response.json() as OrderResponse;
      if (!response.ok || !result.order || !result.trackingUrl) throw new Error("order_failed");
      setSuccess(result);
      clear();
    } catch { setMessage(text.failed); }
    finally { setBusy(false); }
  }

  const IconArrow = locale === "ar" ? ArrowLeft : ArrowRight;
  return <main className="checkout-shell" dir={locale === "ar" ? "rtl" : "ltr"}>
    <header className="checkout-header"><Link className="checkout-back" href="/catalog"><IconArrow size={18} />{text.back}</Link><span className="checkout-brand">7ZMA <i>·</i> {text.bundle}</span></header>
    {success ? <section className="checkout-success"><div className="checkout-success-icon"><Check size={34} /></div><p className="checkout-kicker">7ZMA · {text.success}</p><h1>{text.success}</h1><p>{text.order}: <strong dir="ltr">{success.order?.order_number}</strong></p><Link href={success.trackingUrl ?? "/track"} className="checkout-submit">{text.tracking}<IconArrow size={18} /></Link></section> : <>
      <section className="checkout-intro"><p className="checkout-kicker">07 — CHECKOUT</p><h1>{text.title}</h1><p>{text.subtitle}</p></section>
      {items.length === 0 ? <section className="checkout-empty"><h2>{text.empty}</h2><p>{text.emptyNote}</p><Link href="/catalog" className="checkout-submit">{text.browse}<IconArrow size={18} /></Link></section> : <div className="checkout-layout">
        <section className="checkout-order glass-surface"><div className="checkout-section-title"><span>01</span><div><p>{text.bundle}</p><h2>{items.length} {locale === "ar" ? "منتجات" : "items"}</h2></div></div>
          <div className="checkout-lines">{items.map((item) => {
            const product = productMap.get(item.productId);
            const title = product ? (locale === "ar" ? product.name_ar : product.name_en) : (locale === "ar" ? "منتج غير متاح" : "Unavailable item");
            const price = priceMap.get(`${item.productId}:${selectedCurrency}`) ?? priceMap.get(`${item.productId}:${data?.settings?.default_currency ?? ""}`);
            return <article className="checkout-line" key={item.productId}><div className="checkout-line-art" style={{ "--line-tint": product?.label_color ?? "#77aaff" } as React.CSSProperties} /><div className="checkout-line-copy"><h3>{title}</h3><p>{text.price}: {price ? money(price.price_minor) : text.noPrice} <span>× {item.quantity}</span></p></div><button type="button" className="checkout-remove" aria-label={`${text.remove}: ${title}`} onClick={() => remove(item.productId)}><Trash2 size={17} /></button></article>;
          })}</div>
          <div className="checkout-subtotal"><span>{locale === "ar" ? "المجموع المبدئي" : "Estimated subtotal"}</span><strong>{money(subtotal)}</strong></div><p className="checkout-footnote">{text.security}</p>
          <div className="coupon-field"><label htmlFor="coupon">{text.coupon}</label><div><input id="coupon" value={coupon} placeholder={text.couponPlaceholder} onChange={(e) => { setCoupon(e.target.value); setCouponResult(null); }} /><button type="button" onClick={checkCoupon}>{text.apply}</button></div>{couponResult && <p role="status" className={couponResult.valid ? "coupon-ok" : "coupon-error"}>{couponResult.valid ? text.applied : text.invalid}</p>}</div>
        </section>
        <form className="checkout-form glass-surface" onSubmit={submitOrder}><div className="checkout-section-title"><span>02</span><div><p>{text.customer}</p><h2>{locale === "ar" ? "بيانات الطلب" : "Order details"}</h2></div></div>
          {data?.mode !== "live" && <p className="checkout-notice" role="status">{text.connect}</p>}
          <label>{text.fullName}<input required maxLength={120} autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} /></label>
          <label>{text.phone}<input required type="tel" inputMode="tel" autoComplete="tel" placeholder="+…" minLength={8} maxLength={20} value={phone} onChange={(e) => setPhone(e.target.value)} /></label>
          <label>{text.currency}<select required value={selectedCurrency} onChange={(e) => { setCurrency(e.target.value); localStorage.setItem("7zma.currency", e.target.value); }}><option value="">—</option>{(data?.currencies ?? []).map((c) => <option key={c.code} value={c.code}>{locale === "ar" ? c.symbol_ar : c.symbol_en} · {c.code}</option>)}</select></label>
          <label>{text.payment}<select value={paymentMethodId} onChange={(e) => setPaymentMethodId(e.target.value)}><option value="">{text.none}</option>{(data?.paymentMethods ?? []).map((m) => <option key={m.id} value={m.id}>{locale === "ar" ? m.name_ar : m.name_en}</option>)}</select></label>
          {paymentMethodId && data?.paymentMethods.find((m) => m.id === paymentMethodId) && <p className="checkout-payment-hint">{locale === "ar" ? data.paymentMethods.find((m) => m.id === paymentMethodId)?.instructions_ar : data.paymentMethods.find((m) => m.id === paymentMethodId)?.instructions_en}</p>}
          <label>{text.note}<textarea rows={3} maxLength={1200} value={note} onChange={(e) => setNote(e.target.value)} /></label>
          <label className="checkout-consent"><input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} /><span>{text.consent} <Link href="/terms">{locale === "ar" ? "الشروط" : "Terms"}</Link> · <Link href="/privacy">{locale === "ar" ? "الخصوصية" : "Privacy"}</Link></span></label>
          <TurnstileWidget action="order_create" onToken={setToken} />
          {message && <p className="checkout-message" role="alert">{message}</p>}
          <button className="checkout-submit" type="submit" disabled={busy || !consent}>{busy ? text.working : text.submit}<IconArrow size={18} /></button>
          <p className="checkout-legal-note"><ShieldCheck size={15} />{text.policy}</p>
        </form>
      </div>}
    </>}
  </main>;
}
