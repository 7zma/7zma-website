import { z } from "zod";
import { NextResponse, type NextRequest } from "next/server";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import { createAuthClient } from "@/lib/supabase/server";
import { serviceRpc } from "@/lib/supabase/service-rpc";
import { clientAddress, consumeLimit } from "@/lib/security/rate-limit";
import { verifyTurnstile } from "@/lib/security/turnstile";
import { createTrackingToken } from "@/lib/security/tracking-token";

const orderSchema = z.object({
  name: z.string().trim().min(1).max(120),
  phone: z.string().trim().min(8).max(20).startsWith("+"),
  note: z.string().trim().max(1200).optional().default(""),
  currencyCode: z.string().regex(/^[A-Za-z]{3}$/),
  items: z.array(z.object({ productId: z.string().uuid(), quantity: z.number().int().min(1).max(20) }).strict()).min(1).max(50),
  couponCode: z.string().trim().max(64).optional().nullable(),
  paymentMethodId: z.string().uuid().optional().nullable(),
  turnstileToken: z.string().min(10).max(4096),
}).strict();

type CreateOrderResult = {
  id: string;
  order_number: string;
  status: string;
  currency_code: string;
  subtotal_minor: number;
  discount_minor: number;
  tax_minor: number;
  total_minor: number;
};

function failure(status = 400) {
  return NextResponse.json({ error: "order_unavailable" }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  try {
    const body: unknown = await request.json();
    const parsed = orderSchema.safeParse(body);
    if (!parsed.success) return failure();
    const phone = parsePhoneNumberFromString(parsed.data.phone);
    if (!phone?.isValid() || phone.number !== parsed.data.phone) return failure();

    const address = clientAddress(request);
    const auth = await createAuthClient();
    const { data: { user } } = await auth.auth.getUser();
    if (!await verifyTurnstile(parsed.data.turnstileToken, "order_create", address)) return failure(403);
    await consumeLimit("order-ip-hour", address, 5, 60 * 60);
    await consumeLimit("order-phone-day", phone.number, 3, 24 * 60 * 60);

    const result = await serviceRpc<CreateOrderResult>("create_order", {
      p_customer_name: parsed.data.name,
      p_phone_e164: phone.number,
      p_customer_note: parsed.data.note,
      p_currency_code: parsed.data.currencyCode.toUpperCase(),
      p_items: parsed.data.items.map(({ productId, quantity }) => ({ product_id: productId, quantity })),
      p_coupon_code: parsed.data.couponCode || null,
      p_payment_method_id: parsed.data.paymentMethodId || null,
      p_user_id: user?.id ?? null,
    });
    const token = createTrackingToken(result.order_number, phone.number);
    return NextResponse.json({ order: result, trackingUrl: "/track?token=" + encodeURIComponent(token) }, {
      status: 201,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "rate_limited") return failure(429);
    return failure();
  }
}
