"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Combine, Loader2, Pencil, Unlink } from "lucide-react";

export function MergeSettings({
  advs,
  merges,
}: {
  advs: string[];
  merges: Record<string, string>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
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

  const groups = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const adv of advs) {
      const target = merges[adv];
      if (!target) continue;
      if (!map.has(target)) map.set(target, []);
      map.get(target)!.push(adv);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [advs, merges]);

  const toggle = (adv: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(adv)) next.delete(adv);
      else next.add(adv);
      return next;
    });

  const edit = (target: string, members: string[]) => {
    setName(target);
    setSelected(new Set(members));
    setError(null);
  };

  const call = async (input: string, init: RequestInit) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(input, init);
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? `Erreur ${res.status}`);
      router.refresh();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur réseau");
      return false;
    } finally {
      setBusy(false);
    }
  };

  const submit = async () => {
    const ok = await call("/api/adv-merges", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), advs: [...selected] }),
    });
    if (ok) {
      setName("");
      setSelected(new Set());
    }
  };

  const dissolve = (target: string) =>
    call(`/api/adv-merges?name=${encodeURIComponent(target)}`, { method: "DELETE" });

  const canSubmit = !busy && name.trim().length > 0 && selected.size >= 2;

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="btn-ghost inline-flex items-center justify-center"
        style={{ padding: "0.5rem 0.6rem" }}
        aria-label="Fusionner des produits"
        aria-expanded={open}
        title="Fusionner des produits"
      >
        <Combine size={14} />
      </button>

      {open && (
        <div
          className="card card-elevated p-2 absolute right-0 mt-2 overflow-auto"
          style={{
            width: "min(22rem, calc(100vw - 24px))",
            maxHeight: "min(34rem, calc(100dvh - 80px))",
            zIndex: 1000,
          }}
        >
          <div className="px-2 py-2 text-[12px] font-medium" style={{ color: "var(--ink-2)" }}>
            Fusionner des produits
          </div>
          <div className="divider mb-1" />

          {groups.length > 0 && (
            <>
              <ul className="space-y-0.5 mb-1">
                {groups.map(([target, members]) => (
                  <li key={target} className="flex items-start justify-between gap-2 px-2 py-1.5 rounded hover:bg-[var(--surface-2)]">
                    <div className="min-w-0">
                      <div className="text-[13px] font-medium truncate" style={{ color: "var(--ink)" }}>
                        {target}
                      </div>
                      <div className="text-[11.5px]" style={{ color: "var(--ink-mute)" }}>
                        {members.join(" · ")}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0" style={{ color: "var(--ink-mute)" }}>
                      <button
                        type="button"
                        onClick={() => edit(target, members)}
                        disabled={busy}
                        className="inline-flex h-6 w-6 items-center justify-center rounded hover:text-[color:var(--primary)]"
                        aria-label={`Modifier ${target}`}
                        title="Modifier"
                      >
                        <Pencil size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={() => dissolve(target)}
                        disabled={busy}
                        className="inline-flex h-6 w-6 items-center justify-center rounded hover:text-[color:var(--danger)]"
                        aria-label={`Dissocier ${target}`}
                        title="Dissocier"
                      >
                        <Unlink size={12} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="divider mb-1" />
            </>
          )}

          <div className="px-2 pt-2 pb-1 label">Nouvelle fusion</div>
          <div className="px-2 pb-2">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nom du groupe"
              className="input w-full"
              maxLength={80}
            />
          </div>
          <ul className="space-y-0.5">
            {advs.map((adv) => {
              const checked = selected.has(adv);
              const current = merges[adv];
              return (
                <li key={adv}>
                  <button
                    type="button"
                    onClick={() => toggle(adv)}
                    className="w-full flex items-center justify-between gap-2 px-2 py-1.5 text-[13px] rounded hover:bg-[var(--surface-2)]"
                    aria-pressed={checked}
                  >
                    <span className="flex items-center gap-2.5 min-w-0">
                      <span
                        className="inline-flex h-4 w-4 shrink-0 items-center justify-center"
                        style={{
                          border: checked ? "1px solid var(--primary)" : "1px solid var(--hairline-strong)",
                          background: checked ? "var(--primary)" : "var(--surface)",
                          color: "white",
                          borderRadius: 3,
                        }}
                      >
                        {checked && <Check size={11} />}
                      </span>
                      <span className="truncate" style={{ color: "var(--ink)" }}>
                        {adv}
                      </span>
                    </span>
                    {current && (
                      <span className="tag shrink-0 truncate max-w-[40%]" title={current}>
                        {current}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>

          {error && (
            <p className="px-2 pt-2 text-[12px]" style={{ color: "var(--danger)" }}>
              {error}
            </p>
          )}
          <div className="flex justify-end px-2 pt-2 pb-1">
            <button
              type="button"
              onClick={submit}
              disabled={!canSubmit}
              className="btn-primary inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {busy ? <Loader2 size={13} className="animate-spin" /> : <Combine size={13} />}
              Fusionner
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
