"use client";

import { useEffect } from "react";

export function LiquidLighting() {
  useEffect(() => {
    const root = document.documentElement;
    let frame = 0;
    let x = 50;
    let y = 28;
    const paint = () => {
      frame = 0;
      root.style.setProperty("--light-x", `${x.toFixed(1)}%`);
      root.style.setProperty("--light-y", `${y.toFixed(1)}%`);
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(paint);
    };
    const onPointer = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      x = (event.clientX / Math.max(window.innerWidth, 1)) * 100;
      y = (event.clientY / Math.max(window.innerHeight, 1)) * 100;
      schedule();
    };
    const onScroll = () => {
      y = Math.min(72, 22 + (window.scrollY / Math.max(document.body.scrollHeight, 1)) * 50);
      schedule();
    };
    window.addEventListener("pointermove", onPointer, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("scroll", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return null;
}
