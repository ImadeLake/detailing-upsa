"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CalendarRange, ChevronLeft, ChevronRight } from "lucide-react";

type Iso = string; // YYYY-MM-DD

function toIso(d: Date): Iso {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseIso(s?: string): Date | null {
  if (!s) return null;
  const [y, m, d] = s.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function addMonths(d: Date, n: number) {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function formatLabel(start?: Iso, end?: Iso): string {
  const s = parseIso(start);
  const e = parseIso(end);
  const fmt = (d: Date) => d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
  if (s && e) return `${fmt(s)} → ${fmt(e)}`;
  if (s) return `${fmt(s)} → …`;
  return "Sélectionner une plage";
}

export function DateRangePicker({
  fromName = "from",
  toName = "to",
  defaultFrom,
  defaultTo,
  onChange,
}: {
  fromName?: string;
  toName?: string;
  defaultFrom?: string;
  defaultTo?: string;
  onChange?: (from: string | undefined, to: string | undefined) => void;
}) {
  const [open, setOpen] = useState(false);
  const [start, setStart] = useState<Iso | undefined>(defaultFrom);
  const [end, setEnd] = useState<Iso | undefined>(defaultTo);
  const [hover, setHover] = useState<Iso | null>(null);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const [view, setView] = useState<Date>(() => {
    const d = parseIso(defaultFrom) ?? new Date();
    return startOfMonth(d);
  });

  // Tracks the last value committed via "Valider" so we only notify the
  // parent on explicit confirmation, not on every click in the calendar.
  const lastNotified = useRef<{ from?: string; to?: string }>({ from: defaultFrom, to: defaultTo });

  const commit = () => {
    setOpen(false);
    if (!onChange) return;
    if (lastNotified.current.from === start && lastNotified.current.to === end) return;
    lastNotified.current = { from: start, to: end };
    onChange(start, end);
  };

  const wrapperRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!open) return;
    const update = () => {
      const btn = buttonRef.current;
      if (!btn) return;
      const rect = btn.getBoundingClientRect();
      setCoords({ top: rect.bottom + 8, left: rect.left });
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (wrapperRef.current?.contains(target)) return;
      if (popoverRef.current?.contains(target)) return;
      // Click outside dismisses without committing — revert the in-popover
      // selection to the last-validated value.
      setStart(lastNotified.current.from);
      setEnd(lastNotified.current.to);
      setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const onPick = (iso: Iso) => {
    if (!start || (start && end)) {
      setStart(iso);
      setEnd(undefined);
      return;
    }
    const sDate = parseIso(start)!;
    const pDate = parseIso(iso)!;
    if (pDate < sDate) {
      setStart(iso);
      setEnd(start);
    } else {
      setEnd(iso);
    }
  };

  const clear = () => {
    setStart(undefined);
    setEnd(undefined);
  };

  return (
    <div className="relative" ref={wrapperRef}>
      {start && <input type="hidden" name={fromName} value={start} />}
      {end && <input type="hidden" name={toName} value={end} />}

      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="input inline-flex items-center gap-2 min-w-[260px]"
        aria-expanded={open}
      >
        <CalendarRange size={13} style={{ color: "var(--ink-mute)" }} />
        <span className="flex-1 text-left truncate">{formatLabel(start, end)}</span>
      </button>

      {open && coords && typeof document !== "undefined" &&
        createPortal(
          <div
            ref={popoverRef}
            className="card card-elevated p-3"
            style={{
              position: "fixed",
              top: coords.top,
              left: coords.left,
              zIndex: 1000,
              width: 560,
            }}
          >
            <div className="flex items-center justify-between mb-2 px-1">
              <button
                type="button"
                onClick={() => setView((v) => addMonths(v, -1))}
                className="inline-flex h-7 w-7 items-center justify-center rounded hover:bg-[var(--surface-2)]"
                style={{ color: "var(--ink-2)" }}
                aria-label="Mois précédent"
              >
                <ChevronLeft size={15} />
              </button>
              <div className="flex-1" />
              <button
                type="button"
                onClick={() => setView((v) => addMonths(v, 1))}
                className="inline-flex h-7 w-7 items-center justify-center rounded hover:bg-[var(--surface-2)]"
                style={{ color: "var(--ink-2)" }}
                aria-label="Mois suivant"
              >
                <ChevronRight size={15} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Month
                month={view}
                start={start}
                end={end}
                hover={hover}
                onPick={onPick}
                onHover={setHover}
              />
              <Month
                month={addMonths(view, 1)}
                start={start}
                end={end}
                hover={hover}
                onPick={onPick}
                onHover={setHover}
              />
            </div>

            <div className="mt-3 pt-3 flex items-center justify-between gap-3" style={{ borderTop: "1px solid var(--hairline)" }}>
              <button
                type="button"
                onClick={clear}
                className="text-[12.5px] hover:text-[color:var(--primary)]"
                style={{ color: "var(--ink-mute)" }}
              >
                Effacer
              </button>
              <button
                type="button"
                onClick={commit}
                disabled={!start || !end}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Valider
              </button>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

function Month({
  month,
  start,
  end,
  hover,
  onPick,
  onHover,
}: {
  month: Date;
  start?: Iso;
  end?: Iso;
  hover: Iso | null;
  onPick: (iso: Iso) => void;
  onHover: (iso: Iso | null) => void;
}) {
  const monthLabel = month.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  const first = startOfMonth(month);
  // 0=Sun…6=Sat ; we want Monday-first
  const offset = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();

  const cells: (Date | null)[] = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(month.getFullYear(), month.getMonth(), d));
  while (cells.length % 7 !== 0) cells.push(null);

  const startDate = start ? parseIso(start) : null;
  const endDate = end ? parseIso(end) : null;
  const hoverDate = hover ? parseIso(hover) : null;

  const inRange = (d: Date): boolean => {
    if (!startDate) return false;
    const right = endDate ?? hoverDate;
    if (!right) return false;
    const lo = startDate < right ? startDate : right;
    const hi = startDate < right ? right : startDate;
    return d >= lo && d <= hi;
  };

  return (
    <div>
      <div className="text-[12.5px] font-medium text-center capitalize mb-2" style={{ color: "var(--ink)" }}>
        {monthLabel}
      </div>
      <div className="grid grid-cols-7 gap-y-1 text-[11px] mb-1" style={{ color: "var(--ink-mute)" }}>
        {["L", "M", "M", "J", "V", "S", "D"].map((d, i) => (
          <div key={i} className="text-center">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((d, i) => {
          if (!d) return <div key={i} className="h-8" />;
          const iso = toIso(d);
          const isStart = startDate && isSameDay(d, startDate);
          const isEnd = endDate && isSameDay(d, endDate);
          const between = inRange(d) && !isStart && !isEnd;
          return (
            <button
              key={i}
              type="button"
              onClick={() => onPick(iso)}
              onMouseEnter={() => onHover(iso)}
              onMouseLeave={() => onHover(null)}
              className="h-8 text-[12.5px] relative transition-colors"
              style={{
                background: between
                  ? "var(--primary-soft)"
                  : isStart || isEnd
                  ? "var(--primary)"
                  : "transparent",
                color: isStart || isEnd ? "white" : between ? "var(--primary-deep)" : "var(--ink)",
                fontWeight: isStart || isEnd ? 600 : 400,
                borderRadius: isStart && !endDate ? 4 : isStart ? "4px 0 0 4px" : isEnd ? "0 4px 4px 0" : between ? 0 : 4,
              }}
            >
              {d.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}
