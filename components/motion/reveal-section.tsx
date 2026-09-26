"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";

export function RevealSection({
  children,
  className,
  id,
  delay = 0,
  variant = "rise",
}: {
  children: ReactNode;
  className: string;
  id?: string;
  delay?: number;
  variant?: "rise" | "drift" | "scale";
}) {
  const sectionRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          section.classList.add("is-in-view");
          observer.unobserve(section);
        }
      }
    }, { threshold: 0.12, rootMargin: "0px 0px -36px 0px" });
    observer.observe(section);
    return () => observer.disconnect();
  }, []);
  return (
    <section
      ref={sectionRef}
      id={id}
      className={`${className} reveal-section reveal-section--${variant}`}
      style={{ "--reveal-delay": `${delay}s` } as CSSProperties}
    >
      {children}
    </section>
  );
}
