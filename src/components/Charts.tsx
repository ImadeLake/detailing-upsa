"use client";

import { useEffect, useState } from "react";
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

// Pharma-clinical palette tuned for vibrancy on a light background.
// Saturated, high-chroma but balanced — each hue distinct from the next.
const PIE_COLORS = [
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

const AXIS_COLOR = "#8b8f95";
const GRID_COLOR = "rgba(15, 23, 42, 0.06)";

function useIsNarrow(breakpoint = 640) {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const update = () => setNarrow(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [breakpoint]);
  return narrow;
}

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
        background: "var(--surface)",
        border: "1px solid var(--hairline-strong)",
        borderRadius: 6,
        padding: "10px 12px",
        boxShadow: "0 8px 24px -10px rgba(15, 23, 42, 0.18)",
        fontFamily: "var(--font-sans)",
        fontSize: 12,
        color: "var(--ink)",
        minWidth: 160,
      }}
    >
      {label && (
        <div
          style={{
            color: "var(--ink-mute)",
            marginBottom: 6,
            fontSize: 11,
            fontWeight: 500,
          }}
        >
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
          <span style={{ color: "var(--ink-2)" }}>{p.name}</span>
          <span
            className="mono"
            style={{ marginLeft: "auto", fontVariantNumeric: "tabular-nums", fontWeight: 500, color: "var(--ink)" }}
          >
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
            marginTop: 8,
            paddingTop: 8,
            borderTop: "1px solid var(--hairline)",
          }}
        >
          <span style={{ color: "var(--ink-mute)", fontSize: 11, fontWeight: 500 }}>Total</span>
          <span
            className="mono"
            style={{ marginLeft: "auto", fontVariantNumeric: "tabular-nums", fontWeight: 600, color: "var(--ink)" }}
          >
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
      className="relative inline-flex items-center p-1 select-none"
      style={{
        background: "var(--surface-2)",
        border: "1px solid var(--hairline)",
        borderRadius: 6,
      }}
    >
      <span
        aria-hidden
        className="absolute top-1 bottom-1"
        style={{
          left: isDuration ? "calc(50% + 2px)" : "4px",
          width: "calc(50% - 6px)",
          background: "var(--surface)",
          border: "1px solid var(--hairline)",
          borderRadius: 4,
          transition: "left 200ms cubic-bezier(0.32, 0.72, 0, 1)",
          boxShadow: "0 1px 2px rgba(15, 23, 42, 0.06)",
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
            className="relative z-[1] inline-flex items-center gap-1.5 px-3 py-1"
            style={{
              color: active ? "var(--ink)" : "var(--ink-mute)",
              fontSize: 12,
              fontWeight: active ? 600 : 500,
              transition: "color 200ms ease",
              borderRadius: 4,
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

const USERS_LINE_COLOR = "#06b6d4";

export function MonthlyChart({ data, advs }: { data: MonthlyDatum[]; advs: string[] }) {
  const [metric, setMetric] = useState<"events" | "duration">("events");
  const isNarrow = useIsNarrow();

  const chartData = data.map((d) => ({ month: d.month, users: d.users, ...d[metric] }));
  const formatCompact = (v: number) => {
    if (v >= 1000) return `${Math.round(v / 100) / 10}k`;
    return v.toLocaleString("fr-FR");
  };
  const formatLeft = (v: number) => {
    if (metric === "duration") return formatDurationShort(v);
    return isNarrow ? formatCompact(v) : v.toLocaleString("fr-FR");
  };
  const formatTooltip = (v: number, item: TooltipItem) =>
    item.dataKey === "users"
      ? v.toLocaleString("fr-FR")
      : metric === "duration"
      ? formatDurationShort(v)
      : v.toLocaleString("fr-FR");
  const title = metric === "events" ? "Activité mensuelle" : "Temps mensuel";
  const subtitle =
    metric === "events"
      ? "Clics par mois, répartis par ADV — utilisateurs uniques en superposition"
      : "Temps cumulé par mois, réparti par ADV — utilisateurs uniques en superposition";

  return (
    <section className="card card-elevated p-4 sm:p-5">
      <header className="mb-4 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
        <div>
          <h2 className="text-[14.5px] font-semibold tracking-tight" style={{ color: "var(--ink)" }}>
            {title}
          </h2>
          <p className="text-[12.5px] mt-0.5" style={{ color: "var(--ink-mute)" }}>
            {subtitle}
          </p>
        </div>
        <MetricToggle metric={metric} onChange={setMetric} />
      </header>
      <div className="divider mb-4" />
      <ResponsiveContainer width="100%" height={isNarrow ? 280 : 340}>
        <ComposedChart data={chartData} margin={{ top: 8, right: isNarrow ? 4 : 12, bottom: 0, left: 0 }} barCategoryGap="20%">
          <CartesianGrid stroke={GRID_COLOR} strokeDasharray="2 4" vertical={false} />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 11, fill: AXIS_COLOR }}
            tickLine={false}
            axisLine={false}
            tickFormatter={formatMonth}
            minTickGap={isNarrow ? 16 : 8}
          />
          <YAxis
            yAxisId="left"
            tick={{ fontSize: 11, fill: AXIS_COLOR }}
            tickLine={false}
            axisLine={false}
            width={isNarrow ? 44 : 64}
            tickMargin={6}
            tickFormatter={formatLeft}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fontSize: 11, fill: USERS_LINE_COLOR }}
            tickLine={false}
            axisLine={false}
            width={isNarrow ? 32 : 48}
            tickMargin={6}
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
            wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
            formatter={(v: string) => (
              <span style={{ color: "var(--ink-2)", marginRight: 4 }}>{v}</span>
            )}
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
                radius={isLast ? [3, 3, 0, 0] : [0, 0, 0, 0]}
                maxBarSize={44}
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
            dot={{ r: 3, stroke: USERS_LINE_COLOR, fill: "var(--surface)", strokeWidth: 2 }}
            activeDot={{ r: 5, stroke: USERS_LINE_COLOR, fill: USERS_LINE_COLOR }}
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
  color = "#2563eb",
}: {
  data: Record<string, string | number>[];
  labelKey: string;
  valueKey: string;
  color?: string;
}) {
  const gradId = `grad-bar-${color.replace("#", "")}`;
  const isNarrow = useIsNarrow();
  return (
    <ResponsiveContainer width="100%" height={Math.max(220, data.length * 32)}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: isNarrow ? 8 : 16, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={color} stopOpacity={0.65} />
            <stop offset="100%" stopColor={color} stopOpacity={1} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={GRID_COLOR} strokeDasharray="2 4" horizontal={false} />
        <XAxis
          type="number"
          tick={{ fontSize: 11, fill: AXIS_COLOR }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          type="category"
          dataKey={labelKey}
          tick={{ fontSize: 12, fill: "var(--ink-2)" }}
          tickLine={false}
          axisLine={false}
          width={isNarrow ? 96 : 150}
        />
        <Tooltip content={ChartTooltip as never} cursor={{ fill: "rgba(26, 86, 219, 0.06)" }} />
        <Bar dataKey={valueKey} fill={`url(#${gradId})`} radius={[0, 4, 4, 0]} maxBarSize={20} />
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
  const isNarrow = useIsNarrow();

  // Inline label renderer — places the percentage inside each slice
  // (centered between innerRadius and outerRadius) so labels never
  // overflow the chart container.
  const renderInsideLabel = (p: {
    cx: number;
    cy: number;
    midAngle: number;
    innerRadius: number;
    outerRadius: number;
    percent: number;
  }) => {
    const { cx, cy, midAngle, innerRadius, outerRadius, percent } = p;
    if (percent < 0.06) return null;
    const RADIAN = Math.PI / 180;
    const r = innerRadius + (outerRadius - innerRadius) * 0.55;
    const x = cx + r * Math.cos(-midAngle * RADIAN);
    const y = cy + r * Math.sin(-midAngle * RADIAN);
    return (
      <text
        x={x}
        y={y}
        fill="#ffffff"
        textAnchor="middle"
        dominantBaseline="central"
        style={{ fontSize: 12, fontWeight: 600 }}
      >
        {Math.round(percent * 100)}%
      </text>
    );
  };

  return (
    <ResponsiveContainer width="100%" height={isNarrow ? 360 : 320}>
      <PieChart margin={{ top: 16, right: 16, bottom: isNarrow ? 24 : 16, left: 16 }}>
        <Pie
          data={data}
          dataKey="total_duration"
          nameKey="adv"
          cx={isNarrow ? "50%" : "35%"}
          cy={isNarrow ? "42%" : "50%"}
          innerRadius={isNarrow ? 48 : 60}
          outerRadius={isNarrow ? 100 : 130}
          paddingAngle={1.5}
          stroke="var(--surface)"
          strokeWidth={2}
          label={renderInsideLabel as never}
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
                  background: "var(--surface)",
                  border: "1px solid var(--hairline-strong)",
                  borderRadius: 6,
                  padding: "10px 12px",
                  boxShadow: "0 8px 24px -10px rgba(15, 23, 42, 0.18)",
                  fontFamily: "var(--font-sans)",
                  fontSize: 12,
                  color: "var(--ink)",
                }}
              >
                <div style={{ fontWeight: 600, marginBottom: 2 }}>{adv}</div>
                <div className="mono" style={{ color: "var(--ink-mute)" }}>
                  {formatDurationShort(value)} · <span style={{ color: "var(--primary)" }}>{pct}%</span>
                </div>
              </div>
            );
          }) as never}
        />
        <Legend
          layout={isNarrow ? "horizontal" : "vertical"}
          align={isNarrow ? "center" : "right"}
          verticalAlign={isNarrow ? "bottom" : "middle"}
          iconType="circle"
          wrapperStyle={isNarrow ? { paddingTop: 8 } : undefined}
          formatter={(v: string) => (
            <span style={{ color: "var(--ink-2)", fontSize: 12, marginRight: 4 }}>{v}</span>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
