"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { HBarChart } from "./Charts";

function formatDurationShort(sec: number): string {
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  if (m < 60) return `${m}min`;
  const h = Math.floor(m / 60);
  const mm = m % 60;
  if (h < 24) return `${h}h${mm.toString().padStart(2, "0")}`;
  const d = Math.floor(h / 24);
  return `${d}j ${h % 24}h`;
}

export function AdvCard({
  adv,
  pages,
  defaultOpen = true,
}: {
  adv: string;
  pages: { page: string; total_duration: number; events: number }[];
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const totalSec = pages.reduce((s, p) => s + p.total_duration, 0);
  const totalEvents = pages.reduce((s, p) => s + p.events, 0);

  return (
    <div className="card card-elevated p-4 transition-colors hover:border-[color:var(--hairline-strong)]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 text-left pr-9"
        aria-expanded={open}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <motion.span
            animate={{ rotate: open ? 0 : -90 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="shrink-0 inline-flex"
            style={{ color: "var(--ink-mute)" }}
          >
            <ChevronDown size={14} />
          </motion.span>
          <h3 className="text-[14px] font-semibold tracking-tight truncate" style={{ color: "var(--ink)" }}>
            {adv}
          </h3>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="mono tabular-nums text-[11.5px]" style={{ color: "var(--ink-mute)" }}>
            {totalEvents.toLocaleString("fr-FR")} clics
          </span>
          <span className="tag tag-primary">{formatDurationShort(totalSec)}</span>
        </div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            style={{ overflow: "hidden" }}
          >
            <div className="divider my-3" />
            <HBarChart
              data={pages as unknown as Record<string, string | number>[]}
              labelKey="page"
              valueKey="total_duration"
              color="#2563eb"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
