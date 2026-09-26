import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

function nonce() {
  const bytes = crypto.getRandomValues(new Uint8Array(18));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export async function proxy(request: NextRequest) {
  const requestNonce = nonce();
  const policy = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${requestNonce}' https://challenges.cloudflare.com https://static.cloudflareinsights.com`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: blob: https://*.supabase.co https://challenges.cloudflare.com",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://challenges.cloudflare.com https://cloudflareinsights.com",
    "frame-src https://challenges.cloudflare.com",
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ].join("; ");

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", requestNonce);
  requestHeaders.set("Content-Security-Policy", policy);
  let response = NextResponse.next({ request: { headers: requestHeaders } });
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (supabaseUrl?.startsWith("https://") && supabaseAnonKey && !supabaseAnonKey.startsWith("YOUR_")) {
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(values) {
          values.forEach(({ name, value }) => request.cookies.set(name, value));
          requestHeaders.set("cookie", request.cookies.toString());
          response = NextResponse.next({ request: { headers: requestHeaders } });
          values.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    });
    await supabase.auth.getUser();
  }
  response.headers.set("Content-Security-Policy", policy);
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  if (request.nextUrl.protocol === "https:") {
    response.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  }

  if (request.nextUrl.pathname.startsWith("/admin") || request.nextUrl.pathname.startsWith("/account") || request.nextUrl.pathname.startsWith("/track")) {
    response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
