"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Globe2, X } from "lucide-react";

export function CountriesMultiSelect({
  options,
  selected,
}: {
  options: { name: string; events: number }[];
  selected: string[];
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState<Set<string>>(() => new Set(selected));
  const [coords, setCoords] = useState<{ top: number; left: number; width: number } | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setValue(new Set(selected));
  }, [selected]);

  useLayoutEffect(() => {
    if (!open) return;
    const update = () => {
      const btn = buttonRef.current;
      if (!btn) return;
      const rect = btn.getBoundingClientRect();
      setCoords({
        top: rect.bottom + 8,
        left: rect.left,
        width: Math.max(rect.width, 288),
      });
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
      setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const toggle = (name: string) => {
    setValue((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const clear = () => setValue(new Set());
  const all = () => setValue(new Set(options.map((o) => o.name)));

  const valueArr = [...value];
  const label =
    valueArr.length === 0
      ? "Tous les pays"
      : valueArr.length === 1
      ? valueArr[0]
      : `${valueArr.length} pays`;

  return (
    <div className="relative" ref={wrapperRef}>
      {/* Hidden inputs that the form will submit */}
      {valueArr.map((c) => (
        <input key={c} type="hidden" name="countries" value={c} />
      ))}

      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="input inline-flex items-center gap-2 text-sm min-w-[180px]"
        aria-expanded={open}
      >
        <Globe2 size={14} style={{ color: "var(--muted)" }} />
        <span className="flex-1 text-left truncate">{label}</span>
        {valueArr.length > 0 && (
          <span className="tag" style={{ padding: "0.1rem 0.5rem" }}>
            {valueArr.length}
          </span>
        )}
        <ChevronDown size={14} style={{ color: "var(--muted)" }} />
      </button>

      {open && coords && typeof document !== "undefined" &&
        createPortal(
          <div
            ref={popoverRef}
            className="card card-elevated p-2 max-h-80 overflow-auto"
            role="listbox"
            style={{
              position: "fixed",
              top: coords.top,
              left: coords.left,
              width: coords.width,
              zIndex: 1000,
            }}
          >
            <div className="flex items-center justify-between px-2 py-1.5 text-xs" style={{ color: "var(--muted)" }}>
              <span>{valueArr.length} sélectionné(s)</span>
              <div className="flex items-center gap-2">
                <button type="button" className="hover:underline" onClick={all}>
                  Tout
                </button>
                <span>·</span>
                <button type="button" className="hover:underline" onClick={clear}>
                  Effacer
                </button>
              </div>
            </div>
            <div className="divider mb-1" />
            <ul className="space-y-0.5">
              {options.map((o) => {
                const checked = value.has(o.name);
                return (
                  <li key={o.name}>
                    <button
                      type="button"
                      onClick={() => toggle(o.name)}
                      className="w-full flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-[color-mix(in_oklab,var(--foreground)_5%,transparent)]"
                      role="option"
                      aria-selected={checked}
                    >
                      <span className="flex items-center gap-2">
                        <span
                          className="inline-flex h-4 w-4 items-center justify-center rounded border"
                          style={{
                            borderColor: checked
                              ? "color-mix(in oklab, var(--accent) 80%, transparent)"
                              : "var(--border)",
                            background: checked ? "var(--accent)" : "transparent",
                            color: "white",
                          }}
                        >
                          {checked && <Check size={11} strokeWidth={3} />}
                        </span>
                        <span>{o.name}</span>
                      </span>
                      <span className="tabular-nums text-xs" style={{ color: "var(--muted)" }}>
                        {o.events.toLocaleString("fr-FR")}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>,
          document.body,
        )}

      {/* Quick-clear chip when something is selected */}
      {valueArr.length > 0 && !open && (
        <button
          type="button"
          onClick={clear}
          aria-label="Effacer le filtre pays"
          className="absolute -top-2 -right-2 inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px]"
          style={{ background: "var(--card)", border: "1px solid var(--border)", color: "var(--muted)" }}
        >
          <X size={10} />
        </button>
      )}
    </div>
  );
}
