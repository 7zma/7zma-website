"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

export default function Template({ children }: { children: ReactNode }) {
  const reduceMotion = useReducedMotion();
  return <motion.div initial={false} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} transition={{ duration: reduceMotion ? 0 : .45, ease: [.22, .75, .25, 1] }}>{children}</motion.div>;
}
