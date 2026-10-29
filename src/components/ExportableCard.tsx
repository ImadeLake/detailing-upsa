"use client";

import { useRef } from "react";
import { ExportButton } from "./ExportButton";

export function ExportableCard({
  title,
  subtitle,
  icon,
  exportFilename,
  children,
}: {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  exportFilename?: string;
  children: React.ReactNode;
}) {
  const cardRef = useRef<HTMLElement | null>(null);
  return (
    <section ref={cardRef} className="card card-elevated p-5">
      <header className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2
            className="text-[14.5px] font-semibold tracking-tight flex items-center gap-2"
            style={{ color: "var(--ink)" }}
          >
            {icon} {title}
          </h2>
          {subtitle && (
            <p className="text-[12.5px] mt-0.5" style={{ color: "var(--ink-mute)" }}>
              {subtitle}
            </p>
          )}
        </div>
        <ExportButton targetRef={cardRef} filename={exportFilename ?? title} />
      </header>
      <div className="divider mb-4" />
      {children}
    </section>
  );
}
