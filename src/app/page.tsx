import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import {
  Activity,
  Clock,
  Globe2,
  LogOut,
  Users,
  WifiOff,
} from "lucide-react";
import {
  getAdvDuration,
  getMonthlyTimeseries,
  getDateBounds,
  getKpis,
  getTopCountries,
  getTopPagesPerAdv,
  getTopUsers,
  listCountries,
  type Filters,
} from "@/lib/queries";
import { formatDuration, formatNumber } from "@/lib/format";
import { AdvDurationPie, MonthlyChart, HBarChart } from "@/components/Charts";
import { AdvGrid } from "@/components/AdvGrid";
import { FiltersBar } from "@/components/FiltersBar";
import { ImportButton } from "@/components/ImportButton";
import { AUTH_COOKIE } from "@/lib/auth";
import { AnimatedCounter, Reveal } from "@/components/Motion";

export const dynamic = "force-dynamic";

async function logoutAction() {
  "use server";
  const jar = await cookies();
  jar.delete(AUTH_COOKIE);
  redirect("/login");
}

function parseFilters(sp: { from?: string; to?: string; countries?: string | string[] }): Filters {
  const from = sp.from ? new Date(sp.from) : undefined;
  const to = sp.to ? new Date(sp.to) : undefined;
  let countries: string[] | undefined;
  if (Array.isArray(sp.countries)) countries = sp.countries.filter(Boolean);
  else if (typeof sp.countries === "string" && sp.countries.length > 0) countries = [sp.countries];
  return { from, to, countries };
}

function formatRangeLabel(from?: string, to?: string) {
  if (!from && !to) return "Toute la période";
  const f = from ? new Date(from).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }) : "…";
  const t = to ? new Date(to).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }) : "…";
  return `${f} → ${t}`;
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; countries?: string | string[] }>;
}) {
  const sp = await searchParams;
  const filters = parseFilters(sp);
  const bounds = await getDateBounds();

  const [kpis, monthly, topCountries, topUsers, advDuration, advTopPages, countryOptions] = await Promise.all([
    getKpis(filters),
    getMonthlyTimeseries(filters),
    getTopCountries(filters),
    getTopUsers(filters),
    getAdvDuration(filters),
    getTopPagesPerAdv(filters, 8),
    listCountries(),
  ]);

  const fromVal = sp.from ?? (bounds?.min ? bounds.min.slice(0, 10) : "");
  const toVal = sp.to ?? (bounds?.max ? bounds.max.slice(0, 10) : "");

  return (
    <div className="app-bg min-h-screen">
      {/* ─── Header ────────────────────────────────────────── */}
      <header className="hairline-bottom sticky top-0 z-30 backdrop-blur-md" style={{ background: "color-mix(in oklab, var(--bg) 88%, transparent)" }}>
        <div className="mx-auto max-w-[1320px] px-8 py-3 flex items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <span
              className="inline-flex h-8 w-8 items-center justify-center rounded"
              style={{ background: "var(--primary-soft)", color: "var(--primary)" }}
            >
              <Activity size={15} />
            </span>
            <div>
              <div className="text-[14px] font-semibold tracking-tight" style={{ color: "var(--ink)" }}>
                Detailing Dashboard
              </div>
              <div className="text-[11.5px] mt-0.5" style={{ color: "var(--ink-mute)" }}>
                {formatRangeLabel(fromVal, toVal)}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ImportButton />
            <form action={logoutAction}>
              <button className="btn-ghost inline-flex items-center gap-2">
                <LogOut size={13} /> Déconnexion
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1320px] px-8 py-8 space-y-8">
        {/* ─── Filtres ───────────────────────────────────────── */}
        <Reveal as="section">
          <FiltersBar
            defaultFrom={fromVal}
            defaultTo={toVal}
            countryOptions={countryOptions}
            selectedCountries={filters.countries ?? []}
          />
        </Reveal>

        {/* ─── KPIs ──────────────────────────────────────────── */}
        <section
          className="grid grid-cols-2 lg:grid-cols-4 gap-px border rounded-md overflow-hidden"
          style={{ background: "var(--hairline)", borderColor: "var(--hairline)" }}
        >
          <Kpi
            label="Clics"
            value={kpis.events ?? 0}
            icon={<Activity size={14} />}
            delay={0.04}
          />
          <Kpi
            label="Utilisateurs actifs"
            value={kpis.active_users ?? 0}
            icon={<Users size={14} />}
            delay={0.10}
          />
          <Kpi
            label="Temps total"
            value={kpis.total_duration ?? 0}
            icon={<Clock size={14} />}
            delay={0.16}
            format="duration"
          />
          <Kpi
            label="Part offline"
            value={(kpis.offline_ratio ?? 0) * 100}
            icon={<WifiOff size={14} />}
            delay={0.22}
            format="percent"
          />
        </section>

        {/* ─── Activité ──────────────────────────────────────── */}
        <Reveal as="section" delay={0.04}>
          <MonthlyChart data={monthly.data} advs={monthly.advs} />
        </Reveal>

        {/* ─── Géographie + Répartition ──────────────────────── */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Reveal as="div" delay={0.04}>
            <Card title="Top pays" subtitle="Volume de clics par pays" icon={<Globe2 size={14} />}>
              <HBarChart
                data={topCountries as unknown as Record<string, string | number>[]}
                labelKey="country"
                valueKey="events"
              />
            </Card>
          </Reveal>
          <Reveal as="div" delay={0.10}>
            <Card title="Temps par ADV" subtitle="Somme des durées sur Produits/ADV/…">
              <AdvDurationPie
                data={advDuration as { adv: string; total_duration: number; events: number }[]}
              />
            </Card>
          </Reveal>
        </section>

        {/* ─── Top pages par ADV ─────────────────────────────── */}
        <Reveal as="section" delay={0.04}>
          <div className="flex items-end justify-between mb-3">
            <div>
              <h2 className="text-base font-semibold tracking-tight" style={{ color: "var(--ink)" }}>
                Top pages par ADV
              </h2>
              <p className="text-[12.5px] mt-0.5" style={{ color: "var(--ink-mute)" }}>
                Pages les plus consultées (durée totale) au sein de chaque produit ADV
              </p>
            </div>
          </div>
          <AdvGrid items={advTopPages} />
        </Reveal>

        {/* ─── Top users ─────────────────────────────────────── */}
        <Reveal as="section" delay={0.04}>
          <Card title="Top utilisateurs" subtitle="Triés par volume de clics">
            <div className="overflow-x-auto -mx-1">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="text-left">
                    <th className="py-2 px-2 label">Utilisateur</th>
                    <th className="py-2 px-2 label">Pays</th>
                    <th className="py-2 px-2 label text-right">Clics</th>
                    <th className="py-2 px-2 label text-right">Temps total</th>
                  </tr>
                </thead>
                <tbody>
                  {topUsers.map((u, i) => (
                    <tr
                      key={`${u.user}-${u.country}`}
                      className="table-row"
                      style={{ borderTop: "1px solid var(--hairline)" }}
                    >
                      <td className="py-2.5 px-2">
                        <div className="flex items-center gap-3">
                          <span className="mono tabular-nums text-[11px]" style={{ color: "var(--ink-mute)" }}>
                            {String(i + 1).padStart(2, "0")}
                          </span>
                          <span style={{ color: "var(--ink)" }}>{u.user}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-2">
                        <span className="tag">{u.country}</span>
                      </td>
                      <td className="py-2.5 px-2 text-right mono tabular-nums" style={{ color: "var(--ink)" }}>
                        {formatNumber(u.events)}
                      </td>
                      <td className="py-2.5 px-2 text-right mono tabular-nums" style={{ color: "var(--ink-dim)" }}>
                        {formatDuration(u.total_duration)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </Reveal>

        {/* ─── Footer ────────────────────────────────────────── */}
        <footer className="pt-6 pb-12 hairline-top">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 text-[12px]" style={{ color: "var(--ink-mute)" }}>
            <span>{formatNumber(kpis.events ?? 0)} clics</span>
            <span>
              Données du{" "}
              {bounds?.min ? new Date(bounds.min).toLocaleDateString("fr-FR") : "…"} au{" "}
              {bounds?.max ? new Date(bounds.max).toLocaleDateString("fr-FR") : "…"}
            </span>
          </div>
        </footer>
      </main>
    </div>
  );
}

function Kpi({
  label,
  value,
  icon,
  delay = 0,
  format = "number",
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  delay?: number;
  format?: "number" | "duration" | "percent";
}) {
  return (
    <Reveal
      delay={delay}
      className="kpi-cell bg-[var(--surface)] p-5 transition-colors hover:bg-[color-mix(in_oklab,var(--primary-soft)_30%,var(--surface))]"
    >
      <div className="flex items-center justify-between mb-5">
        <span className="label">{label}</span>
        <span
          className="inline-flex h-7 w-7 items-center justify-center rounded"
          style={{
            background: "var(--primary-soft)",
            color: "var(--primary)",
          }}
        >
          {icon}
        </span>
      </div>
      <div className="kpi-num text-[32px] tabular-nums">
        <AnimatedCounter value={value} format={format} />
      </div>
    </Reveal>
  );
}

function Card({
  title,
  subtitle,
  icon,
  right,
  children,
}: {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="card card-elevated p-5">
      <header className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-[14.5px] font-semibold tracking-tight flex items-center gap-2" style={{ color: "var(--ink)" }}>
            {icon} {title}
          </h2>
          {subtitle && (
            <p className="text-[12.5px] mt-0.5" style={{ color: "var(--ink-mute)" }}>
              {subtitle}
            </p>
          )}
        </div>
        {right}
      </header>
      <div className="divider mb-4" />
      {children}
    </section>
  );
}
