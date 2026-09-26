import { NextResponse, type NextRequest } from "next/server";
import { getServerEnv } from "@/lib/env";

export async function GET(request: NextRequest) {
  try {
    const env = getServerEnv();
    if (request.headers.get("authorization") !== `Bearer ${env.cronSecret}`) {
      return NextResponse.json({ ok: false }, { status: 401, headers: { "Cache-Control": "no-store" } });
    }
    const response = await fetch(`${env.supabaseUrl}/rest/v1/public_settings?select=updated_at`, {
      cache: "no-store",
      headers: { apikey: env.supabaseAnonKey, Authorization: `Bearer ${env.supabaseAnonKey}` },
    });
    if (!response.ok) return NextResponse.json({ ok: false }, { status: 502, headers: { "Cache-Control": "no-store" } });
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ ok: false }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
