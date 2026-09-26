import "server-only";

export type ServerEnv = {
  supabaseUrl: string;
  supabaseAnonKey: string;
  serviceRoleKey: string;
  turnstileSecret: string;
  cronSecret: string;
  siteUrl: string;
};

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value || value.startsWith("YOUR_")) throw new Error("server_configuration_missing");
  return value;
}

export function getServerEnv(): ServerEnv {
  const supabaseUrl = required("NEXT_PUBLIC_SUPABASE_URL");
  const siteUrl = required("NEXT_PUBLIC_SITE_URL");
  try {
    const parsedSupabaseUrl = new URL(supabaseUrl);
    const parsedSiteUrl = new URL(siteUrl);
    const localDevelopment = process.env.NODE_ENV !== "production" && ["localhost", "127.0.0.1"].includes(parsedSiteUrl.hostname);
    if (parsedSupabaseUrl.protocol !== "https:" || (parsedSiteUrl.protocol !== "https:" && !(localDevelopment && parsedSiteUrl.protocol === "http:"))) throw new Error();
  } catch {
    throw new Error("server_configuration_invalid");
  }
  return {
    supabaseUrl,
    supabaseAnonKey: required("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    serviceRoleKey: required("SUPABASE_SERVICE_ROLE_KEY"),
    turnstileSecret: required("TURNSTILE_SECRET_KEY"),
    cronSecret: required("CRON_SECRET"),
    siteUrl,
  };
}

export function getPublicSupabaseEnv(): { url: string; anonKey: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !anonKey || url.startsWith("YOUR_") || anonKey.startsWith("YOUR_")) {
    throw new Error("public_configuration_missing");
  }
  return { url, anonKey };
}
