"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";

type OrderResult = { order_number: string; status: string; currency_code: string; currency_decimals: number; subtotal_minor: number; discount_minor: number; tax_minor: number; total_minor: number; created_at: string; items: { name_ar: string; name_en: string; quantity: number }[] };
const statusNames: Record<string,string> = { new:"جديد",contacted:"تم التواصل",awaiting_payment:"بانتظار الدفع",paid:"مدفوع",delivered:"تم التسليم",cancelled:"ملغي",refunded:"مسترد" };

export default function TrackPage() {
  const [number, setNumber] = useState(""); const [phone, setPhone] = useState(""); const [order, setOrder] = useState<OrderResult | null>(null); const [message, setMessage] = useState(""); const [busy, setBusy] = useState(false);
  async function lookup(url: string, body?: object) { setBusy(true); setMessage(""); setOrder(null); try { const response = await fetch(url, { method: body ? "POST" : "GET", headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined, cache: "no-store" }); if (!response.ok) throw new Error(); const result = await response.json(); setOrder(result.order as OrderResult); } catch { setMessage("تعذر العثور على الطلب. تحقق من رقم الطلب ورقم الهاتف."); } finally { setBusy(false); } }
  useEffect(() => { const token = new URLSearchParams(window.location.search).get("token"); if (token) void lookup(`/api/orders/track?token=${encodeURIComponent(token)}`); }, []);
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); await lookup("/api/orders/track", { orderNumber: number, phone }); }
  const money = (minor: number, currency: string, decimals: number) => { try { return new Intl.NumberFormat("ar", { style:"currency", currency, minimumFractionDigits:decimals, maximumFractionDigits:decimals }).format(minor / (10 ** decimals)); } catch { return `${currency} ${minor}`; } };
  return <main className="auth-shell" dir="rtl"><Link className="auth-back" href="/">← 7ZMA</Link><section className="auth-card tracking-card"><p className="eyebrow">7ZMA · تتبع الطلب</p><h1>حالة طلبك</h1><p>أدخل رقم الطلب ورقم الهاتف المستخدم عند الشراء.</p><form onSubmit={submit}><label htmlFor="order-number">رقم الطلب</label><input id="order-number" required value={number} onChange={(e)=>setNumber(e.target.value)} autoComplete="off"/><label htmlFor="order-phone">رقم الهاتف بصيغة دولية</label><input id="order-phone" type="tel" required placeholder="+…" value={phone} onChange={(e)=>setPhone(e.target.value)} autoComplete="tel"/><button disabled={busy}>{busy ? "جار البحث…" : "تتبع الطلب"}</button></form>{message && <p role="alert">{message}</p>}{order && <section className="tracking-result" aria-live="polite"><h2>{order.order_number}</h2><p>الحالة: <strong>{statusNames[order.status] ?? order.status}</strong></p><p>تاريخ الطلب: {new Date(order.created_at).toLocaleDateString("ar")}</p><ul>{order.items.map((item,index)=><li key={`${item.name_ar}-${index}`}>{item.name_ar} × {item.quantity}</li>)}</ul><p>الإجمالي: <strong>{money(order.total_minor,order.currency_code,order.currency_decimals)}</strong></p></section>}</section></main>;
}
