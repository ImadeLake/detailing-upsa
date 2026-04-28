"use client";

import { motion, useMotionValue, useSpring, useTransform, useInView } from "motion/react";
import { useEffect, useRef, type ReactNode } from "react";
import { formatDuration as fmtDuration, formatNumber as fmtNumber, formatPercent as fmtPercent } from "@/lib/format";

/* ───────────────────────── Reveal ─────────────────────────
   Subtle fade + lift on scroll-in. Stagger via `delay`. */
export function Reveal({
  children,
  delay = 0,
  y = 12,
  className,
  style,
  as = "div",
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
  style?: React.CSSProperties;
  as?: "div" | "section" | "header" | "li";
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -10% 0px" });
  const Tag = motion[as] as typeof motion.div;
  return (
    <Tag
      ref={ref}
      initial={{ opacity: 0, y }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y }}
      transition={{ duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
      style={style}
    >
      {children}
    </Tag>
  );
}

/* ───────────────────────── Animated counter ─────────────────────────
   Counts from 0 to `value` once when in view. `format` is a string flag
   so the component can be used directly from server components. */
type CounterFormat = "number" | "duration" | "percent";

function applyFormat(v: number, kind: CounterFormat): string {
  if (kind === "duration") return fmtDuration(Math.round(v));
  if (kind === "percent") return fmtPercent(v / 100);
  return fmtNumber(Math.round(v));
}

export function AnimatedCounter({
  value,
  format = "number",
  className,
}: {
  value: number;
  format?: CounterFormat;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -10% 0px" });
  const mv = useMotionValue(0);
  const spring = useSpring(mv, { stiffness: 60, damping: 18, mass: 0.8 });
  const text = useTransform(spring, (v) => applyFormat(v, format));

  useEffect(() => {
    if (inView) mv.set(value);
  }, [inView, value, mv]);

  useEffect(() => {
    return text.on("change", (v) => {
      if (ref.current) ref.current.textContent = v;
    });
  }, [text]);

  return (
    <span ref={ref} className={className}>
      {applyFormat(0, format)}
    </span>
  );
}
