"use client";

import { useState } from "react";
import { Activity, Clock } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { MonthlyDatum } from "@/lib/queries";

const PIE_COLORS = [
  "#6366f1",
  "#06b6d4",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#a855f7",
  "#ec4899",
  "#84cc16",
  "#f97316",
  "#64748b",
];

const AXIS_COLOR = "#9aa3b2";
const GRID_COLOR = "rgba(148, 163, 184, 0.18)";

function formatDurationShort(sec: number): string {
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  if (m < 60) return `${m}min`;
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${h}h${mm.toString().padStart(2, "0")}`;
}

function formatDay(s: string) {
  const d = new Date(s);
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}

function formatMonth(s: string) {
  const [y, m] = s.split("-").map(Number);
  if (!y || !m) return s;
  const d = new Date(y, m - 1, 1);
  return d.toLocaleDateString("fr-FR", { month: "short", year: "2-digit" });
}

type TooltipItem = {
  name?: string;
  value?: number;
  color?: string;
  dataKey?: string;
  payload?: Record<string, unknown>;
};
function ChartTooltip(props: {
  active?: boolean;
  payload?: readonly TooltipItem[];
  label?: string | number;
  formatValue?: (v: number, item: TooltipItem) => string;
  totalKeys?: string[];
}) {
  const { active, payload, label, formatValue, totalKeys } = props;
  if (!active || !payload || payload.length === 0) return null;
  const fmt = (v: number, item: TooltipItem) =>
    formatValue ? formatValue(v, item) : v.toLocaleString("fr-FR");
  const totalItems = totalKeys
    ? payload.filter((p) => p.dataKey && totalKeys.includes(p.dataKey))
    : payload;
  const total = totalItems.reduce((s, p) => s + (typeof p.value === "number" ? p.value : 0), 0);
  const showTotal = Boolean(totalKeys) && totalItems.length > 1;
  return (
    <div
      style={{
        background: "color-mix(in oklab, var(--card) 95%, transparent)",
        border: "1px solid var(--border)",
        borderRadius: 10,
        padding: "8px 12px",
        boxShadow: "0 8px 24px -12px rgba(15, 23, 42, 0.25)",
        fontSize: 12,
        color: "var(--foreground)",
        backdropFilter: "blur(6px)",
      }}
    >
      {label && (
        <div style={{ color: "var(--muted)", marginBottom: 4, fontSize: 11 }}>
          {typeof label === "string" && /^\d{4}-\d{2}-\d{2}$/.test(label)
            ? formatDay(label)
            : typeof label === "string" && /^\d{4}-\d{2}$/.test(label)
            ? formatMonth(label)
            : label}
        </div>
      )}
      {payload.map((p, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              display: "inline-block",
              width: 8,
              height: 8,
              borderRadius: 999,
              background: p.color,
            }}
          />
          <span style={{ color: "var(--muted)" }}>{p.name}</span>
          <span style={{ marginLeft: "auto", fontVariantNumeric: "tabular-nums", fontWeight: 500 }}>
            {typeof p.value === "number" ? fmt(p.value, p) : p.value}
          </span>
        </div>
      ))}
      {showTotal && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginTop: 6,
            paddingTop: 6,
            borderTop: "1px solid var(--border)",
          }}
        >
          <span style={{ color: "var(--muted)" }}>Total</span>
          <span style={{ marginLeft: "auto", fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>
            {fmt(total, totalItems[0])}
          </span>
        </div>
      )}
    </div>
  );
}

function MetricToggle({
  metric,
  onChange,
}: {
  metric: "events" | "duration";
  onChange: (m: "events" | "duration") => void;
}) {
  const isDuration = metric === "duration";
  return (
    <div
      role="tablist"
      aria-label="Mesure"
      className="relative inline-flex items-center rounded-full p-1 text-xs select-none"
      style={{
        background: "color-mix(in oklab, var(--foreground) 5%, transparent)",
        border: "1px solid var(--border)",
        boxShadow: "inset 0 1px 2px rgba(15,23,42,0.04)",
      }}
    >
      <span
        aria-hidden
        className="absolute top-1 bottom-1 rounded-full"
        style={{
          left: isDuration ? "calc(50% + 2px)" : "4px",
          width: "calc(50% - 6px)",
          background: "var(--card)",
          border: "1px solid var(--border)",
          boxShadow: "0 1px 2px rgba(15,23,42,0.08), 0 1px 0 rgba(255,255,255,0.6) inset",
          transition: "left 180ms cubic-bezier(0.32, 0.72, 0, 1)",
        }}
      />
      {(
        [
          { id: "events", label: "Clics", Icon: Activity },
          { id: "duration", label: "Temps", Icon: Clock },
        ] as const
      ).map(({ id, label, Icon }) => {
        const active = metric === id;
        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(id)}
            className="relative z-[1] inline-flex items-center gap-1.5 px-3 py-1 rounded-full"
            style={{
              color: active ? "var(--foreground)" : "var(--muted)",
              fontWeight: active ? 600 : 500,
              transition: "color 150ms ease",
            }}
          >
            <Icon size={12} />
            {label}
          </button>
        );
      })}
    </div>
  );
}

const USERS_LINE_COLOR = "#0ea5e9";

export function MonthlyChart({ data, advs }: { data: MonthlyDatum[]; advs: string[] }) {
  const [metric, setMetric] = useState<"events" | "duration">("events");

  const chartData = data.map((d) => ({ month: d.month, users: d.users, ...d[metric] }));
  const formatLeft = (v: number) =>
    metric === "duration" ? formatDurationShort(v) : v.toLocaleString("fr-FR");
  const formatTooltip = (v: number, item: TooltipItem) =>
    item.dataKey === "users" ? v.toLocaleString("fr-FR") : formatLeft(v);
  const title = metric === "events" ? "Activité mensuelle" : "Temps mensuel";
  const subtitle =
    metric === "events"
      ? "Clics par mois, répartis par ADV — utilisateurs uniques en superposition"
      : "Temps cumulé par mois, réparti par ADV — utilisateurs uniques en superposition";

  return (
    <section className="card card-elevated p-5">
      <header className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold tracking-tight flex items-center gap-2">{title}</h2>
          <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
            {subtitle}
          </p>
        </div>
        <MetricToggle metric={metric} onChange={setMetric} />
      </header>
      <div className="divider mb-4" />
      <ResponsiveContainer width="100%" height={340}>
        <ComposedChart data={chartData} margin={{ top: 8, right: 12, bottom: 0, left: 0 }} barCategoryGap="20%">
          <CartesianGrid stroke={GRID_COLOR} strokeDasharray="2 4" vertical={false} />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 11, fill: AXIS_COLOR }}
            tickLine={false}
            axisLine={false}
            tickFormatter={formatMonth}
            minTickGap={8}
          />
          <YAxis
            yAxisId="left"
            tick={{ fontSize: 11, fill: AXIS_COLOR }}
            tickLine={false}
            axisLine={false}
            width={64}
            tickMargin={8}
            tickFormatter={formatLeft}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fontSize: 11, fill: USERS_LINE_COLOR }}
            tickLine={false}
            axisLine={false}
            width={48}
            tickMargin={8}
            tickFormatter={(v: number) => v.toLocaleString("fr-FR")}
            allowDecimals={false}
          />
          <Tooltip
            content={(p: object) => (
              <ChartTooltip
                {...(p as Record<string, unknown>)}
                formatValue={formatTooltip}
                totalKeys={advs}
              />
            )}
            cursor={{ fill: GRID_COLOR }}
          />
          <Legend
            iconType="circle"
            wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
            formatter={(v: string) => <span style={{ color: "var(--foreground)" }}>{v}</span>}
          />
          {advs.map((adv, i) => {
            const isLast = i === advs.length - 1;
            return (
              <Bar
                key={adv}
                yAxisId="left"
                dataKey={adv}
                stackId="adv"
                name={adv}
                fill={PIE_COLORS[i % PIE_COLORS.length]}
                radius={isLast ? [6, 6, 0, 0] : [0, 0, 0, 0]}
                maxBarSize={48}
              />
            );
          })}
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="users"
            name="Utilisateurs"
            stroke={USERS_LINE_COLOR}
            strokeWidth={2}
            dot={{ r: 3, stroke: USERS_LINE_COLOR, fill: "var(--card)", strokeWidth: 2 }}
            activeDot={{ r: 5 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </section>
  );
}

export function HBarChart({
  data,
  labelKey,
  valueKey,
  color = "#6366f1",
}: {
  data: Record<string, string | number>[];
  labelKey: string;
  valueKey: string;
  color?: string;
}) {
  const gradId = `grad-bar-${color.replace("#", "")}`;
  return (
    <ResponsiveContainer width="100%" height={Math.max(220, data.length * 32)}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={color} stopOpacity={0.55} />
            <stop offset="100%" stopColor={color} stopOpacity={1} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={GRID_COLOR} strokeDasharray="2 4" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 11, fill: AXIS_COLOR }} tickLine={false} axisLine={false} />
        <YAxis
          type="category"
          dataKey={labelKey}
          tick={{ fontSize: 11, fill: AXIS_COLOR }}
          tickLine={false}
          axisLine={false}
          width={150}
        />
        <Tooltip content={ChartTooltip as never} cursor={{ fill: GRID_COLOR }} />
        <Bar dataKey={valueKey} fill={`url(#${gradId})`} radius={[0, 6, 6, 0]} maxBarSize={20} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function AdvDurationPie({
  data,
}: {
  data: { adv: string; total_duration: number; events: number }[];
}) {
  const total = data.reduce((s, d) => s + d.total_duration, 0);
  return (
    <ResponsiveContainer width="100%" height={360}>
      <PieChart>
        <Pie
          data={data}
          dataKey="total_duration"
          nameKey="adv"
          cx="38%"
          cy="50%"
          innerRadius={70}
          outerRadius={130}
          paddingAngle={2}
          stroke="var(--card)"
          strokeWidth={2}
          label={((p: { total_duration?: number }) => {
            const v = p.total_duration ?? 0;
            const pct = total ? Math.round((v / total) * 100) : 0;
            return pct >= 6 ? `${pct}%` : "";
          }) as never}
          labelLine={false}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          content={(({ active, payload }: { active?: boolean; payload?: readonly TooltipItem[] }) => {
            if (!active || !payload?.length) return null;
            const p = payload[0];
            const value = (p.value ?? 0) as number;
            const adv = (p.payload?.adv as string) ?? "";
            const pct = total ? ((value / total) * 100).toFixed(1) : "0";
            return (
              <div
                style={{
                  background: "color-mix(in oklab, var(--card) 95%, transparent)",
                  border: "1px solid var(--border)",
                  borderRadius: 10,
                  padding: "8px 12px",
                  boxShadow: "0 8px 24px -12px rgba(15, 23, 42, 0.25)",
                  fontSize: 12,
                  color: "var(--foreground)",
                }}
              >
                <div style={{ fontWeight: 600 }}>{adv}</div>
                <div style={{ color: "var(--muted)", marginTop: 2 }}>
                  {formatDurationShort(value)} · {pct}%
                </div>
              </div>
            );
          }) as never}
        />
        <Legend
          layout="vertical"
          align="right"
          verticalAlign="middle"
          iconType="circle"
          formatter={(v: string) => <span style={{ color: "var(--foreground)", fontSize: 12 }}>{v}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
