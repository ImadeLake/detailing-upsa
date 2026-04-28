import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import {
  Activity,
  Calendar,
  Clock,
  Globe2,
  LogOut,
  RefreshCcw,
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
import { formatDuration, formatNumber, formatPercent } from "@/lib/format";
import { AdvDurationPie, MonthlyChart, HBarChart } from "@/components/Charts";
import { AdvGrid } from "@/components/AdvGrid";
import { CountriesMultiSelect } from "@/components/CountriesMultiSelect";
import { ImportButton } from "@/components/ImportButton";
import { AUTH_COOKIE } from "@/lib/auth";

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
      <header className="sticky top-0 z-30 border-b backdrop-blur-md" style={{ borderColor: "var(--border)", background: "color-mix(in oklab, var(--background) 78%, transparent)" }}>
        <div className="mx-auto max-w-7xl px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[color-mix(in_oklab,var(--accent)_15%,transparent)] text-[color-mix(in_oklab,var(--accent)_85%,var(--foreground))]">
              <Activity size={18} />
            </span>
            <div>
              <h1 className="text-sm font-semibold tracking-tight">Detailing Dashboard</h1>
              <p className="text-xs" style={{ color: "var(--muted)" }}>
                {formatRangeLabel(fromVal, toVal)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ImportButton />
            <form action={logoutAction}>
              <button className="btn-ghost text-sm inline-flex items-center gap-2">
                <LogOut size={14} /> Déconnexion
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8 space-y-6">
        {/* Filtres */}
        <form className="card card-elevated p-4 flex flex-wrap items-end gap-3">
          <div className="flex items-center gap-2 mr-2 text-sm" style={{ color: "var(--muted)" }}>
            <Calendar size={16} />
            <span>Période</span>
          </div>
          <label className="flex flex-col text-xs" style={{ color: "var(--muted)" }}>
            <span className="mb-1">Du</span>
            <input type="date" name="from" defaultValue={fromVal} className="input" />
          </label>
          <label className="flex flex-col text-xs" style={{ color: "var(--muted)" }}>
            <span className="mb-1">Au</span>
            <input type="date" name="to" defaultValue={toVal} className="input" />
          </label>
          <div className="flex flex-col text-xs" style={{ color: "var(--muted)" }}>
            <span className="mb-1">Pays</span>
            <CountriesMultiSelect
              options={countryOptions}
              selected={filters.countries ?? []}
            />
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <button type="submit" className="btn-primary text-sm">
              Appliquer
            </button>
            <a href="/" className="btn-ghost text-sm inline-flex items-center gap-2">
              <RefreshCcw size={14} /> Réinitialiser
            </a>
          </div>
        </form>

        {/* KPIs */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Kpi
            label="Clics"
            value={formatNumber(kpis.events ?? 0)}
            icon={<Activity size={16} />}
            tint="var(--accent)"
          />
          <Kpi
            label="Utilisateurs actifs"
            value={formatNumber(kpis.active_users ?? 0)}
            icon={<Users size={16} />}
            tint="var(--accent-2)"
          />
          <Kpi
            label="Temps total"
            value={formatDuration(kpis.total_duration ?? 0)}
            icon={<Clock size={16} />}
            tint="var(--success)"
          />
          <Kpi
            label="Part offline"
            value={formatPercent(kpis.offline_ratio ?? 0)}
            icon={<WifiOff size={16} />}
            tint="var(--warning)"
          />
        </section>

        {/* Activité */}
        <MonthlyChart data={monthly.data} advs={monthly.advs} />

        {/* Top pays */}
        <Card
          title="Top pays"
          subtitle="Volume de clics par pays"
          icon={<Globe2 size={14} />}
        >
          <HBarChart
            data={topCountries as unknown as Record<string, string | number>[]}
            labelKey="country"
            valueKey="events"
          />
        </Card>

        {/* Pie ADV */}
        <Card
          title="Temps passé par produit ADV"
          subtitle="Somme des durées sur les pages sous Produits/ADV/ADV …"
        >
          <AdvDurationPie
            data={advDuration as { adv: string; total_duration: number; events: number }[]}
          />
        </Card>

        {/* Top pages par ADV — toutes en parallèle */}
        <section className="space-y-3">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="text-sm font-semibold tracking-tight">Top pages par ADV</h2>
              <p className="text-xs" style={{ color: "var(--muted)" }}>
                Pages les plus consultées (durée totale) au sein de chaque produit ADV
              </p>
            </div>
          </div>
          <AdvGrid items={advTopPages} />
        </section>

        {/* Top users */}
        <Card title="Top utilisateurs" subtitle="Triés par volume de clics">
          <div className="overflow-x-auto -mx-2">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left" style={{ color: "var(--muted)" }}>
                  <th className="py-2 px-2 font-medium">Utilisateur</th>
                  <th className="py-2 px-2 font-medium">Pays</th>
                  <th className="py-2 px-2 font-medium text-right">Clics</th>
                  <th className="py-2 px-2 font-medium text-right">Temps total</th>
                </tr>
              </thead>
              <tbody>
                {topUsers.map((u, i) => (
                  <tr
                    key={`${u.user}-${u.country}`}
                    className="table-row border-t"
                    style={{ borderColor: "var(--border)" }}
                  >
                    <td className="py-2.5 px-2">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium" style={{ background: "color-mix(in oklab, var(--accent) 12%, transparent)", color: "color-mix(in oklab, var(--accent) 80%, var(--foreground))" }}>
                          {i + 1}
                        </span>
                        <span>{u.user}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-2">
                      <span className="tag">{u.country}</span>
                    </td>
                    <td className="py-2.5 px-2 text-right tabular-nums">{formatNumber(u.events)}</td>
                    <td className="py-2.5 px-2 text-right tabular-nums" style={{ color: "var(--muted)" }}>
                      {formatDuration(u.total_duration)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <footer className="py-6 text-center text-xs" style={{ color: "var(--muted)" }}>
          {formatNumber(kpis.events ?? 0)} clics · données du{" "}
          {bounds?.min ? new Date(bounds.min).toLocaleDateString("fr-FR") : "…"} au{" "}
          {bounds?.max ? new Date(bounds.max).toLocaleDateString("fr-FR") : "…"}
        </footer>
      </main>
    </div>
  );
}

function Kpi({
  label,
  value,
  icon,
  tint,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  tint: string;
}) {
  return (
    <div className="card card-elevated kpi-glow p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wide" style={{ color: "var(--muted)" }}>
          {label}
        </span>
        <span
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg"
          style={{
            background: `color-mix(in oklab, ${tint} 14%, transparent)`,
            color: `color-mix(in oklab, ${tint} 85%, var(--foreground))`,
          }}
        >
          {icon}
        </span>
      </div>
      <div className="mt-3 text-3xl font-semibold tracking-tight tabular-nums">{value}</div>
    </div>
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
          <h2 className="text-sm font-semibold tracking-tight flex items-center gap-2">
            {icon} {title}
          </h2>
          {subtitle && (
            <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
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
