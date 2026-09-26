import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Providers } from "@/components/providers";
import "./globals.css";

function getMetadataBase() {
  try {
    const value = process.env.NEXT_PUBLIC_SITE_URL;
    return value && !value.startsWith("YOUR_") ? new URL(value) : new URL("https://example.invalid");
  } catch {
    return new URL("https://example.invalid");
  }
}

export const metadata: Metadata = {
  metadataBase: getMetadataBase(),
  title: { default: "7ZMA | حزمة", template: "%s | 7ZMA" },
  description: "جمّع حزمتك.. وارفع مستواك. ألعاب وتجارب رقمية بطريقتك.",
  applicationName: "7ZMA",
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    title: "7ZMA | حزمة",
    description: "جمّع حزمتك.. وارفع مستواك.",
    images: ["/og.svg"],
  },
  icons: { icon: "/icon.svg", apple: "/apple-touch-icon.svg" },
};

export const viewport: Viewport = {
  themeColor: "#0A1024",
  colorScheme: "dark",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body><Providers>{children}</Providers></body>
    </html>
  );
}
