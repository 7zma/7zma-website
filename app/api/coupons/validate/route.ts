import { z } from "zod";
import { NextResponse, type NextRequest } from "next/server";
import { serviceRpc } from "@/lib/supabase/service-rpc";
import { clientAddress, consumeLimit } from "@/lib/security/rate-limit";

const schema = z.object({
  code: z.string().trim().min(1).max(64),
  currencyCode: z.string().regex(/^[A-Za-z]{3}$/),
  items: z.array(z.object({ productId: z.string().uuid(), quantity: z.number().int().min(1).max(20) }).strict()).min(1).max(50),
}).strict();

export async function POST(request: NextRequest) {
  try {
    const body: unknown = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ valid: false, reason: "invalid_request" }, { status: 400, headers: { "Cache-Control": "no-store" } });
    await consumeLimit("coupon-preview", clientAddress(request), 30, 60);
    const preview = await serviceRpc<unknown>("validate_coupon", {
      coupon_code: parsed.data.code.toUpperCase(),
      currency: parsed.data.currencyCode.toUpperCase(),
      items: parsed.data.items.map(({ productId, quantity }) => ({ product_id: productId, quantity })),
    });
    return NextResponse.json(preview, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const status = error instanceof Error && error.message === "rate_limited" ? 429 : 400;
    return NextResponse.json({ valid: false, reason: status === 429 ? "rate_limited" : "unavailable" }, { status, headers: { "Cache-Control": "no-store" } });
  }
}
