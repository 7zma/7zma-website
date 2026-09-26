import "server-only";

import { getServerEnv } from "@/lib/env";

export async function serviceRpc<T>(name: string, payload: Record<string, unknown>): Promise<T> {
  if (!/^[a-z][a-z0-9_]*$/.test(name)) throw new Error("invalid_rpc_name");
  const env = getServerEnv();
  const response = await fetch(`${env.supabaseUrl}/rest/v1/rpc/${name}`, {
    method: "POST",
    cache: "no-store",
    headers: {
      apikey: env.serviceRoleKey,
      Authorization: `Bearer ${env.serviceRoleKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) throw new Error("database_operation_failed");
  return body as T;
}

export async function serviceSelect<T>(resource: string, query: URLSearchParams): Promise<T> {
  if (!/^[a-z][a-z0-9_]*$/.test(resource)) throw new Error("invalid_resource");
  const env = getServerEnv();
  const response = await fetch(`${env.supabaseUrl}/rest/v1/${resource}?${query.toString()}`, {
    cache: "no-store",
    headers: { apikey: env.serviceRoleKey, Authorization: `Bearer ${env.serviceRoleKey}`, Accept: "application/json" },
  });
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) throw new Error("database_operation_failed");
  return body as T;
}
