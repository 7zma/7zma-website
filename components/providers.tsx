"use client";

import { useEffect, useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { RealtimeChannel } from "@supabase/supabase-js";

const liveTables = ["products", "product_prices", "categories", "banners", "bundle_tiers", "coupons", "store_settings", "currencies", "payment_methods", "greetings"] as const;

function RealtimeBridge() {
  const queryClient = useQueryClient();
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;
    let fallback: number | undefined;
    const refresh = () => void queryClient.invalidateQueries({ queryKey: ["storefront"] });
    const channel: RealtimeChannel = supabase.channel("public-store-changes");
    for (const table of liveTables) {
      channel.on("postgres_changes", { event: "*", schema: "public", table }, refresh);
    }
    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        if (fallback) window.clearInterval(fallback);
        fallback = undefined;
      } else if (!fallback) {
        fallback = window.setInterval(refresh, 30_000);
      }
    });
    return () => {
      if (fallback) window.clearInterval(fallback);
      if (channel) void supabase.removeChannel(channel);
    };
  }, [queryClient]);
  return null;
}

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: { queries: { staleTime: 30_000, retry: 2, refetchOnWindowFocus: true } },
  }));
  return <QueryClientProvider client={queryClient}><RealtimeBridge />{children}</QueryClientProvider>;
}
