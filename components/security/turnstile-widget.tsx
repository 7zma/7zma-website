"use client";

import { useEffect, useRef } from "react";

type TurnstileOptions = {
  sitekey: string;
  action: string;
  callback: (token: string) => void;
  "expired-callback": () => void;
  "error-callback": () => void;
};

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: TurnstileOptions) => string;
      remove: (widgetId: string) => void;
    };
  }
}

const scriptUrl = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

export function TurnstileWidget({ action, onToken }: { action: string; onToken: (token: string) => void }) {
  const container = useRef<HTMLDivElement>(null);
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  useEffect(() => {
    if (!siteKey || !container.current) return;
    let widgetId: string | null = null;
    const render = () => {
      if (!window.turnstile || !container.current || widgetId) return;
      widgetId = window.turnstile.render(container.current, {
        sitekey: siteKey,
        action,
        callback: onToken,
        "expired-callback": () => onToken(""),
        "error-callback": () => onToken(""),
      });
    };
    const existing = document.querySelector<HTMLScriptElement>('script[src="' + scriptUrl + '"]');
    if (window.turnstile) render();
    else if (existing) existing.addEventListener("load", render, { once: true });
    else {
      const script = document.createElement("script");
      script.src = scriptUrl;
      script.async = true;
      script.defer = true;
      script.addEventListener("load", render, { once: true });
      document.head.appendChild(script);
    }
    return () => {
      existing?.removeEventListener("load", render);
      if (widgetId && window.turnstile) window.turnstile.remove(widgetId);
    };
  }, [action, onToken, siteKey]);

  return <div className="turnstile-control" aria-label="Human verification">{siteKey ? <div ref={container} /> : <p role="status">Human verification is not configured.</p>}</div>;
}
