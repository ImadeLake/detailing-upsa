"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";

// Pharma-clinical palette tuned for vibrancy on a light background.
// Saturated, high-chroma but balanced — each hue distinct from the next.
export const PALETTE = [
  "#2563eb", // bright blue
  "#06b6d4", // cyan
  "#10b981", // emerald
  "#f59e0b", // amber
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#ef4444", // red
  "#14b8a6", // teal
  "#f97316", // orange
  "#84cc16", // lime
];

// The native color picker fires on every drag step — only persist once it settles.
const SAVE_DELAY_MS = 400;

type Ctx = {
  advs: string[];
  colorOf: (adv: string) => string;
  setColor: (adv: string, color: string) => void;
  reset: () => void;
};

const AdvColorsContext = createContext<Ctx | null>(null);

// `advs` is the full, unfiltered list of ADVs so default colors stay stable
// whatever the active filters are. `initialColors` are the overrides stored
// in the `adv_colors` table.
export function AdvColorsProvider({
  advs,
  initialColors,
  children,
}: {
  advs: string[];
  initialColors: Record<string, string>;
  children: React.ReactNode;
}) {
  const [custom, setCustom] = useState<Record<string, string>>(initialColors);
  const saved = useRef<Record<string, string>>(initialColors);
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const defaults = useMemo(
    () => new Map(advs.map((adv, i) => [adv, PALETTE[i % PALETTE.length]])),
    [advs],
  );

  const colorOf = useCallback(
    (adv: string) => custom[adv] ?? defaults.get(adv) ?? PALETTE[0],
    [custom, defaults],
  );

  const setColor = useCallback((adv: string, color: string) => {
    setCustom((prev) => ({ ...prev, [adv]: color }));
    clearTimeout(timers.current.get(adv));
    timers.current.set(
      adv,
      setTimeout(async () => {
        timers.current.delete(adv);
        try {
          const res = await fetch("/api/adv-colors", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ adv, color }),
          });
          if (!res.ok) throw new Error(`Erreur ${res.status}`);
          saved.current = { ...saved.current, [adv]: color };
        } catch (err) {
          console.error("[adv-colors] save failed", err);
          // Roll back to the last value the server accepted.
          setCustom((prev) => {
            const next = { ...prev };
            if (saved.current[adv]) next[adv] = saved.current[adv];
            else delete next[adv];
            return next;
          });
        }
      }, SAVE_DELAY_MS),
    );
  }, []);

  const reset = useCallback(async () => {
    timers.current.forEach(clearTimeout);
    timers.current.clear();
    const previous = saved.current;
    setCustom({});
    try {
      const res = await fetch("/api/adv-colors", { method: "DELETE" });
      if (!res.ok) throw new Error(`Erreur ${res.status}`);
      saved.current = {};
    } catch (err) {
      console.error("[adv-colors] reset failed", err);
      setCustom(previous);
    }
  }, []);

  const value = useMemo(() => ({ advs, colorOf, setColor, reset }), [advs, colorOf, setColor, reset]);
  return <AdvColorsContext.Provider value={value}>{children}</AdvColorsContext.Provider>;
}

export function useAdvColors(): Ctx {
  const ctx = useContext(AdvColorsContext);
  if (!ctx) throw new Error("useAdvColors must be used inside <AdvColorsProvider>");
  return ctx;
}
