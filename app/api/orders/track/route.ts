import { z } from "zod";
import { NextResponse, type NextRequest } from "next/server";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import { serviceRpc } from "@/lib/supabase/service-rpc";
import { clientAddress, consumeLimit } from "@/lib/security/rate-limit";
import { readTrackingToken } from "@/lib/security/tracking-token";

const requestSchema = z.object({ orderNumber: z.string().trim().min(3).max(40), phone: z.string().trim().startsWith("+").max(20) }).strict();
const safeOrderSchema = z.object({
  order_number: z.string(), status: z.string(), currency_code: z.string(), currency_decimals: z.number().int().min(0).max(4), subtotal_minor: z.number(),
  discount_minor: z.number(), tax_minor: z.number(), total_minor: z.number(), created_at: z.string(),
  items: z.array(z.object({ name_ar: z.string(), name_en: z.string(), quantity: z.number().int() })),
});

function notFound() {
  return NextResponse.json({ error: "order_not_found" }, { status: 404, headers: { "Cache-Control": "no-store" } });
}

async function lookup(orderNumber: string, phone: string, request: Request) {
  const address = clientAddress(request);
  await consumeLimit("track-ip", address, 12, 15 * 60);
  await consumeLimit("track-order", orderNumber + ":" + phone, 8, 15 * 60);
  const response = await serviceRpc<unknown>("track_order", { p_order_number: orderNumber, p_phone_e164: phone });
  const parsed = safeOrderSchema.safeParse(response);
  return parsed.success ? parsed.data : null;
}

export async function POST(request: NextRequest) {
  try {
    const body: unknown = await request.json();
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) return notFound();
    const phone = parsePhoneNumberFromString(parsed.data.phone);
    if (!phone?.isValid() || phone.number !== parsed.data.phone) return notFound();
    const result = await lookup(parsed.data.orderNumber, phone.number, request);
    return result ? NextResponse.json({ order: result }, { headers: { "Cache-Control": "no-store" } }) : notFound();
  } catch {
    return notFound();
  }
}

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get("token");
    const payload = token ? readTrackingToken(token) : null;
    if (!payload) return notFound();
    const result = await lookup(payload.orderNumber, payload.phone, request);
    return result ? NextResponse.json({ order: result }, { headers: { "Cache-Control": "no-store" } }) : notFound();
  } catch {
    return notFound();
  }
}
