"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Globe2, X } from "lucide-react";
import { countryFlag } from "@/lib/format";

export function CountriesMultiSelect({
  options,
  selected,
  onChange,
}: {
  options: { name: string; events: number }[];
  selected: string[];
  onChange?: (next: string[]) => void;
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
      const vw = window.innerWidth;
      const margin = 12;
      const desiredWidth = Math.min(Math.max(rect.width, 288), vw - margin * 2);
      const maxLeft = vw - desiredWidth - margin;
      const left = Math.max(margin, Math.min(rect.left, maxLeft));
      setCoords({
        top: rect.bottom + 8,
        left,
        width: desiredWidth,
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

  // Notify parent when popover closes if selection changed.
  const lastNotified = useRef<string[]>(selected);
  useEffect(() => {
    if (open) return;
    if (!onChange) return;
    const arr = [...value];
    const same =
      arr.length === lastNotified.current.length &&
      arr.every((v, i) => v === lastNotified.current[i]);
    if (same) return;
    lastNotified.current = arr;
    onChange(arr);
  }, [open, value, onChange, selected]);

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
      ? `${countryFlag(valueArr[0])} ${valueArr[0]}`
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
        className="input inline-flex items-center gap-2 w-full sm:w-auto sm:min-w-[200px]"
        aria-expanded={open}
      >
        <Globe2 size={13} style={{ color: "var(--ink-mute)" }} />
        <span className="flex-1 text-left truncate">{label}</span>
        {valueArr.length > 0 && (
          <span className="tag tag-primary" style={{ padding: "0.1rem 0.5rem" }}>
            {valueArr.length}
          </span>
        )}
        <ChevronDown size={13} style={{ color: "var(--ink-mute)" }} />
      </button>

      {open && coords && typeof document !== "undefined" &&
        createPortal(
          <div
            ref={popoverRef}
            className="card card-elevated p-2 overflow-auto"
            role="listbox"
            style={{
              position: "fixed",
              top: coords.top,
              left: coords.left,
              width: coords.width,
              maxHeight: "min(20rem, calc(100dvh - " + (coords.top + 12) + "px))",
              zIndex: 1000,
            }}
          >
            <div className="flex items-center justify-between px-2 py-2 text-[12px]" style={{ color: "var(--ink-mute)" }}>
              <span>{valueArr.length} sélectionné(s)</span>
              <div className="flex items-center gap-2">
                <button type="button" className="hover:text-[color:var(--primary)]" onClick={all}>
                  Tout
                </button>
                <span>·</span>
                <button type="button" className="hover:text-[color:var(--primary)]" onClick={clear}>
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
                      className="w-full flex items-center justify-between gap-2 px-2 py-1.5 text-[13px] rounded hover:bg-[var(--surface-2)]"
                      role="option"
                      aria-selected={checked}
                    >
                      <span className="flex items-center gap-2.5">
                        <span
                          className="inline-flex h-4 w-4 items-center justify-center"
                          style={{
                            border: checked ? "1px solid var(--primary)" : "1px solid var(--hairline-strong)",
                            background: checked ? "var(--primary)" : "var(--surface)",
                            color: "white",
                            borderRadius: 3,
                          }}
                        >
                          {checked && <Check size={11} strokeWidth={3} />}
                        </span>
                        <span aria-hidden className="text-[14px] leading-none">{countryFlag(o.name)}</span>
                        <span style={{ color: "var(--ink)" }}>{o.name}</span>
                      </span>
                      <span className="mono tabular-nums text-[11.5px]" style={{ color: "var(--ink-mute)" }}>
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
          style={{ background: "var(--surface)", border: "1px solid var(--hairline-strong)", color: "var(--ink-mute)" }}
        >
          <X size={10} />
        </button>
      )}
    </div>
  );
}
