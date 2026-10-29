"use client";

import { useEffect, useRef, useState } from "react";
import { RotateCcw, Settings } from "lucide-react";
import { PALETTE, useAdvColors } from "./AdvColors";

export function ColorSettings() {
  const { advs, colorOf, setColor, reset } = useAdvColors();
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (wrapperRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="btn-ghost inline-flex items-center justify-center"
        style={{ padding: "0.5rem 0.6rem" }}
        aria-label="Couleurs des produits"
        aria-expanded={open}
        title="Couleurs des produits"
      >
        <Settings size={14} />
      </button>

      {open && (
        <div
          className="card card-elevated p-2 absolute right-0 mt-2 overflow-auto"
          style={{
            width: "min(20rem, calc(100vw - 24px))",
            maxHeight: "min(28rem, calc(100dvh - 80px))",
            zIndex: 1000,
          }}
        >
          <div className="flex items-center justify-between px-2 py-2 text-[12px]" style={{ color: "var(--ink-mute)" }}>
            <span className="font-medium" style={{ color: "var(--ink-2)" }}>
              Couleurs des produits
            </span>
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center gap-1 hover:text-[color:var(--primary)]"
            >
              <RotateCcw size={11} /> Réinitialiser
            </button>
          </div>
          <div className="divider mb-1" />
          {advs.length === 0 ? (
            <p className="px-2 py-3 text-[12.5px]" style={{ color: "var(--ink-mute)" }}>
              Aucun produit importé.
            </p>
          ) : (
            <ul className="space-y-0.5">
              {advs.map((adv) => {
                const color = colorOf(adv);
                return (
                  <li
                    key={adv}
                    className="flex items-center justify-between gap-3 px-2 py-1.5 rounded hover:bg-[var(--surface-2)]"
                  >
                    <span className="text-[13px] truncate" style={{ color: "var(--ink)" }} title={adv}>
                      {adv}
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                      {PALETTE.slice(0, 5).map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setColor(adv, c)}
                          aria-label={`Choisir ${c}`}
                          className="h-4 w-4 rounded-full transition-transform hover:scale-110"
                          style={{
                            background: c,
                            outline: c === color ? "2px solid var(--ink-2)" : "none",
                            outlineOffset: 1,
                          }}
                        />
                      ))}
                      <label
                        className="relative ml-1 h-6 w-6 rounded cursor-pointer"
                        style={{ background: color, border: "1px solid var(--hairline-strong)" }}
                        title="Couleur personnalisée"
                      >
                        <input
                          type="color"
                          value={color}
                          onChange={(e) => setColor(adv, e.target.value)}
                          className="absolute inset-0 opacity-0 cursor-pointer"
                          aria-label={`Couleur de ${adv}`}
                        />
                      </label>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
