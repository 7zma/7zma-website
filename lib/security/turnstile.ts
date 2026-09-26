import "server-only";

import { getServerEnv } from "@/lib/env";

type TurnstileResponse = {
  success?: boolean;
  action?: string;
  hostname?: string;
  challenge_ts?: string;
  "error-codes"?: string[];
};

export async function verifyTurnstile(token: string, expectedAction: string, address?: string): Promise<boolean> {
  if (token.length < 10 || token.length > 4096) return false;
  const env = getServerEnv();
  const form = new URLSearchParams({ secret: env.turnstileSecret, response: token });
  if (address && address !== "unknown") form.set("remoteip", address);
  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    cache: "no-store",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form,
  });
  if (!response.ok) return false;
  const result = (await response.json().catch(() => null)) as TurnstileResponse | null;
  if (!result?.success || result.action !== expectedAction) return false;
  const expectedHost = new URL(env.siteUrl).hostname;
  return result.hostname === expectedHost;
}
