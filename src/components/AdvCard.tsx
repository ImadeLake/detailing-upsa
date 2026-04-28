"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
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
    <div className="card card-elevated p-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 text-left pr-9"
        aria-expanded={open}
      >
        <div className="flex items-center gap-2 min-w-0">
          <ChevronDown
            size={16}
            className="shrink-0 transition-transform"
            style={{
              transform: open ? "rotate(0deg)" : "rotate(-90deg)",
              color: "var(--muted)",
            }}
          />
          <h3 className="text-sm font-semibold truncate">{adv}</h3>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs tabular-nums" style={{ color: "var(--muted)" }}>
            {totalEvents.toLocaleString("fr-FR")} clics
          </span>
          <span className="tag">{formatDurationShort(totalSec)}</span>
        </div>
      </button>

      {open && (
        <>
          <div className="divider my-3" />
          <HBarChart
            data={pages as unknown as Record<string, string | number>[]}
            labelKey="page"
            valueKey="total_duration"
            color="#a855f7"
          />
        </>
      )}
    </div>
  );
}
