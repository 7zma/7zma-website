import "server-only";

import { getPublicSupabaseEnv } from "@/lib/env";
import { createAuthClient } from "@/lib/supabase/server";
import { consumeLimit } from "@/lib/security/rate-limit";

export async function userRpc<T>(
  name: string,
  payload: Record<string, unknown>,
  limit?: { label: string; count: number; seconds: number },
): Promise<{ userId: string; data: T } | null> {
  if (!/^[a-z][a-z0-9_]*$/.test(name)) throw new Error("invalid_rpc_name");
  const auth = await createAuthClient();
  const { data: { user }, error: userError } = await auth.auth.getUser();
  if (userError || !user) return null;
  const { data: { session }, error: sessionError } = await auth.auth.getSession();
  if (sessionError || !session?.access_token || session.user.id !== user.id) return null;
  if (limit) await consumeLimit(limit.label, user.id, limit.count, limit.seconds);
  const { url, anonKey } = getPublicSupabaseEnv();
  const response = await fetch(`${url}/rest/v1/rpc/${name}`, {
    method: "POST",
    cache: "no-store",
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${session.access_token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });
  const data: unknown = await response.json().catch(() => null);
  if (!response.ok) throw new Error("account_request_failed");
  return { userId: user.id, data: data as T };
}
