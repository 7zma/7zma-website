import { z } from "zod";
import { NextResponse, type NextRequest } from "next/server";
import { userRpc } from "@/lib/supabase/user-rpc";

const schema = z.object({ username: z.string().trim().min(1).max(64) }).strict();

export async function POST(request: NextRequest) {
  try {
    const body: unknown = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ available: false, reason: "invalid_request", suggestions: [] }, { status: 400, headers: { "Cache-Control": "no-store" } });
    const result = await userRpc<{ available: boolean; reason: string | null; suggestions: string[] }>(
      "check_username", { candidate: parsed.data.username }, { label: "username-route", count: 20, seconds: 60 },
    );
    if (!result) return NextResponse.json({ available: false, reason: "sign_in_required", suggestions: [] }, { status: 401, headers: { "Cache-Control": "no-store" } });
    return NextResponse.json(result.data, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const status = error instanceof Error && error.message === "rate_limited" ? 429 : 400;
    return NextResponse.json({ available: false, reason: status === 429 ? "rate_limited" : "unavailable", suggestions: [] }, { status, headers: { "Cache-Control": "no-store" } });
  }
}
