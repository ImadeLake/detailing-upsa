"use client";

import { createContext, useCallback, useContext, useMemo, useSyncExternalStore } from "react";

const STORAGE_KEY = "advColors.v1";

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

type Ctx = {
  advs: string[];
  colorOf: (adv: string) => string;
  setColor: (adv: string, color: string) => void;
  reset: () => void;
};

const AdvColorsContext = createContext<Ctx | null>(null);

// localStorage-backed store, also kept in sync across tabs.
const listeners = new Set<() => void>();

function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

function getSnapshot(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function write(next: Record<string, string> | null) {
  try {
    if (next) localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* quota / private mode */
  }
  listeners.forEach((cb) => cb());
}

function parse(raw: string | null): Record<string, string> {
  try {
    const obj = raw ? JSON.parse(raw) : {};
    return obj && typeof obj === "object" && !Array.isArray(obj) ? obj : {};
  } catch {
    return {};
  }
}

// `advs` is the full, unfiltered list of ADVs so default colors stay stable
// whatever the active filters are.
export function AdvColorsProvider({ advs, children }: { advs: string[]; children: React.ReactNode }) {
  const raw = useSyncExternalStore(subscribe, getSnapshot, () => null);
  const custom = useMemo(() => parse(raw), [raw]);

  const defaults = useMemo(
    () => new Map(advs.map((adv, i) => [adv, PALETTE[i % PALETTE.length]])),
    [advs],
  );

  const colorOf = useCallback(
    (adv: string) => custom[adv] ?? defaults.get(adv) ?? PALETTE[0],
    [custom, defaults],
  );

  const setColor = useCallback((adv: string, color: string) => {
    write({ ...parse(getSnapshot()), [adv]: color });
  }, []);

  const reset = useCallback(() => write(null), []);

  const value = useMemo(() => ({ advs, colorOf, setColor, reset }), [advs, colorOf, setColor, reset]);
  return <AdvColorsContext.Provider value={value}>{children}</AdvColorsContext.Provider>;
}

export function useAdvColors(): Ctx {
  const ctx = useContext(AdvColorsContext);
  if (!ctx) throw new Error("useAdvColors must be used inside <AdvColorsProvider>");
  return ctx;
}
