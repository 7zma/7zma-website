import "server-only";

import { createHmac } from "node:crypto";
import { getServerEnv } from "@/lib/env";
import { serviceRpc } from "@/lib/supabase/service-rpc";

function digest(value: string): string {
  const key = getServerEnv().cronSecret;
  return createHmac("sha256", key).update(value).digest("hex");
}

export function clientAddress(request: Request): string {
  const trustedAddress = request.headers.get("x-real-ip")?.trim();
  if (trustedAddress) return trustedAddress;
  if (process.env.NODE_ENV !== "production") {
    return request.headers.get("x-forwarded-for")?.split(",", 1)[0]?.trim() || "unknown";
  }
  return "unknown";
}

export async function consumeLimit(label: string, subject: string, limit: number, windowSeconds: number) {
  const key = `${label}:${digest(subject)}`;
  const allowed = await serviceRpc<unknown>("consume_rate_limit", {
    p_key: key,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });
  if (allowed !== true) throw new Error("rate_limited");
}
