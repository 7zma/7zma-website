import { NextResponse, type NextRequest } from "next/server";
import { createAuthClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const next = request.nextUrl.searchParams.get("next") ?? "/account";
  if (code) {
    const client = await createAuthClient();
    await client.auth.exchangeCodeForSession(code);
  }
  return NextResponse.redirect(new URL(next.startsWith("/") && !next.startsWith("//") ? next : "/account", request.url));
}
