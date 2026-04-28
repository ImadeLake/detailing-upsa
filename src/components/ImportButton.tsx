"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, TriangleAlert, Upload } from "lucide-react";

type Status =
  | { kind: "idle" }
  | { kind: "loading"; name: string }
  | { kind: "success"; inserted: number; seen: number; skipped: number; durationMs: number }
  | { kind: "error"; message: string };

export function ImportButton() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const router = useRouter();

  const onPick = () => inputRef.current?.click();

  const onChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setStatus({ kind: "loading", name: file.name });
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/import", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        setStatus({ kind: "error", message: data?.error ?? `Erreur ${res.status}` });
        return;
      }
      setStatus({
        kind: "success",
        inserted: data.inserted,
        seen: data.seen,
        skipped: data.skipped,
        durationMs: data.durationMs,
      });
      router.refresh();
    } catch (err) {
      setStatus({
        kind: "error",
        message: err instanceof Error ? err.message : "Erreur réseau",
      });
    }
  };

  const loading = status.kind === "loading";

  return (
    <div className="flex items-center gap-2">
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        className="sr-only"
        onChange={onChange}
      />
      <button
        type="button"
        onClick={onPick}
        disabled={loading}
        className="btn-ghost inline-flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
        aria-busy={loading}
      >
        {loading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
        {loading ? "Import…" : "Importer"}
      </button>
      <StatusPill status={status} />
    </div>
  );
}

function StatusPill({ status }: { status: Status }) {
  if (status.kind === "idle") return null;
  if (status.kind === "loading") {
    return (
      <span
        className="text-[12px] truncate max-w-[200px]"
        style={{ color: "var(--ink-mute)" }}
        title={status.name}
      >
        {status.name}
      </span>
    );
  }
  if (status.kind === "success") {
    const dt = (status.durationMs / 1000).toFixed(1);
    return (
      <span
        className="text-[11.5px] inline-flex items-center gap-1.5 px-2 py-1 rounded-full"
        style={{
          background: "color-mix(in oklab, var(--success) 10%, transparent)",
          color: "var(--success)",
          border: "1px solid color-mix(in oklab, var(--success) 30%, transparent)",
          fontWeight: 500,
        }}
        title={`Vu: ${status.seen} · Ignorés: ${status.skipped}`}
      >
        <Check size={11} />
        <span className="mono tabular-nums">{status.inserted.toLocaleString("fr-FR")}</span>
        <span style={{ color: "color-mix(in oklab, var(--success) 70%, var(--ink-mute))" }}>· {dt}s</span>
      </span>
    );
  }
  return (
    <span
      className="text-[11.5px] inline-flex items-center gap-1.5 px-2 py-1 max-w-[260px] rounded-full"
      style={{
        background: "color-mix(in oklab, var(--danger) 10%, transparent)",
        color: "var(--danger)",
        border: "1px solid color-mix(in oklab, var(--danger) 30%, transparent)",
        fontWeight: 500,
      }}
      title={status.message}
    >
      <TriangleAlert size={11} />
      <span className="truncate">{status.message}</span>
    </span>
  );
}
