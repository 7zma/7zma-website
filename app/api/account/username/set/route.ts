import { z } from "zod";
import { NextResponse, type NextRequest } from "next/server";
import { userRpc } from "@/lib/supabase/user-rpc";

const schema = z.object({ username: z.string().trim().min(1).max(64) }).strict();

export async function POST(request: NextRequest) {
  try {
    const body: unknown = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ ok: false, reason: "invalid_request", suggestions: [] }, { status: 400, headers: { "Cache-Control": "no-store" } });
    const user = await userRpc<{ ok: boolean; username?: string; reason?: string; suggestions?: string[] }>(
      "set_username", { candidate: parsed.data.username }, { label: "username-set", count: 4, seconds: 60 * 60 },
    );
    if (!user) return NextResponse.json({ ok: false, reason: "sign_in_required", suggestions: [] }, { status: 401, headers: { "Cache-Control": "no-store" } });
    return NextResponse.json(user.data, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const status = error instanceof Error && error.message === "rate_limited" ? 429 : 400;
    return NextResponse.json({ ok: false, reason: status === 429 ? "rate_limited" : "unavailable", suggestions: [] }, { status, headers: { "Cache-Control": "no-store" } });
  }
}
