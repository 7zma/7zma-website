import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "7ZMA | حزمة",
    short_name: "7ZMA",
    description: "جمّع حزمتك.. وارفع مستواك",
    start_url: "/",
    display: "standalone",
    background_color: "#0A1024",
    theme_color: "#0A1024",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/maskable-icon.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
  };
}
