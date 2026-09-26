import type { Metadata } from "next";
export const metadata: Metadata = { title: "Order tracking", robots: { index: false, follow: false } };
export default function TrackLayout({ children }: Readonly<{ children: React.ReactNode }>) { return children; }
