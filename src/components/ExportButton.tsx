"use client";

import { useState, type RefObject } from "react";
import { Download } from "lucide-react";
import { toPng } from "html-to-image";

function slugify(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function ExportButton({
  targetRef,
  filename,
  className = "",
}: {
  targetRef: RefObject<HTMLElement | null>;
  filename: string;
  className?: string;
}) {
  const [busy, setBusy] = useState(false);

  const onClick = async () => {
    const node = targetRef.current;
    if (!node || busy) return;
    setBusy(true);
    try {
      const dataUrl = await toPng(node, {
        pixelRatio: 2,
        backgroundColor: "#ffffff",
        cacheBust: true,
        filter: (n) => {
          if (!(n instanceof HTMLElement)) return true;
          return !n.dataset?.exportIgnore;
        },
      });
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `${slugify(filename)}.png`;
      a.click();
    } catch (err) {
      console.error("Export PNG failed", err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      data-export-ignore
      aria-label="Exporter en PNG"
      title="Exporter en PNG"
      className={`btn-ghost inline-flex items-center gap-1.5 ${className}`}
      style={{ padding: "0.35rem 0.6rem", fontSize: 12 }}
    >
      <Download size={13} />
      <span>{busy ? "…" : "PNG"}</span>
    </button>
  );
}
