import { db } from "@/db";
import { sql, type SQL } from "drizzle-orm";

export type Filters = {
  from?: Date;
  to?: Date;
  countries?: string[]; // names; empty/undefined = all
};

function rangeClause(f: Filters): SQL {
  const from = f.from?.toISOString();
  const to = f.to?.toISOString();
  if (from && to) return sql`e.occurred_at >= ${from}::timestamptz AND e.occurred_at < ${to}::timestamptz`;
  if (from) return sql`e.occurred_at >= ${from}::timestamptz`;
  if (to) return sql`e.occurred_at < ${to}::timestamptz`;
  return sql`TRUE`;
}

function countryClause(f: Filters): SQL {
  if (!f.countries || f.countries.length === 0) return sql`TRUE`;
  // Use sql.join to inline the parameterized list safely.
  const list = sql.join(
    f.countries.map((name) => sql`${name}`),
    sql`, `,
  );
  return sql`u.country_id IN (
    SELECT id FROM countries WHERE name IN (${list})
  )`;
}

// JOIN with users only when needed (i.e. when filtering by country).
function maybeUserJoin(f: Filters): SQL {
  return f.countries && f.countries.length > 0 ? sql`JOIN users u ON u.id = e.user_id` : sql``;
}

export async function listCountries() {
  const rows = await db.execute<{ name: string; events: number }>(sql`
    SELECT c.name, COUNT(*)::int AS events
    FROM countries c
    LEFT JOIN users u  ON u.country_id = c.id
    LEFT JOIN events e ON e.user_id    = u.id
    GROUP BY c.name
    ORDER BY events DESC NULLS LAST, c.name
  `);
  return rows;
}

// All ADVs ever seen, unfiltered and alphabetical — gives each product a
// stable default color regardless of the active filters.
export async function listAdvs() {
  const rows = await db.execute<{ adv: string }>(sql`
    SELECT DISTINCT split_part(full_path, '/', 3) AS adv
    FROM pages
    WHERE split_part(full_path, '/', 2) = 'ADV'
      AND split_part(full_path, '/', 3) LIKE 'ADV %'
    ORDER BY adv
  `);
  return rows.map((r) => r.adv);
}

export async function getKpis(f: Filters) {
  const [row] = await db.execute<{
    events: number;
    active_users: number;
    total_duration: number;
    offline_ratio: number;
  }>(sql`
    SELECT
      COUNT(*)::int                                            AS events,
      COUNT(DISTINCT e.user_id)::int                           AS active_users,
      COALESCE(SUM(e.duration_sec), 0)::int                    AS total_duration,
      COALESCE(AVG(CASE WHEN e.is_offline THEN 1.0 ELSE 0.0 END), 0)::float AS offline_ratio
    FROM events e
    ${maybeUserJoin(f)}
    WHERE ${rangeClause(f)} AND ${countryClause(f)}
  `);
  return row;
}

export type MonthlyDatum = {
  month: string;
  events: Record<string, number>;
  duration: Record<string, number>;
  users: number;
};

export async function getMonthlyTimeseries(f: Filters) {
  const [advRows, userRows] = await Promise.all([
    db.execute<{ month: string; adv: string; events: number; duration: number }>(sql`
      SELECT
        to_char(date_trunc('month', e.occurred_at), 'YYYY-MM') AS month,
        split_part(p.full_path, '/', 3)                        AS adv,
        COUNT(*)::int                                          AS events,
        COALESCE(SUM(e.duration_sec), 0)::int                  AS duration
      FROM events e
      JOIN pages p ON p.id = e.page_id
      ${maybeUserJoin(f)}
      WHERE ${rangeClause(f)} AND ${countryClause(f)}
        AND split_part(p.full_path, '/', 2) = 'ADV'
        AND split_part(p.full_path, '/', 3) LIKE 'ADV %'
      GROUP BY 1, 2
      ORDER BY 1
    `),
    db.execute<{ month: string; users: number }>(sql`
      SELECT
        to_char(date_trunc('month', e.occurred_at), 'YYYY-MM') AS month,
        COUNT(DISTINCT e.user_id)::int                         AS users
      FROM events e
      JOIN pages p ON p.id = e.page_id
      ${maybeUserJoin(f)}
      WHERE ${rangeClause(f)} AND ${countryClause(f)}
        AND split_part(p.full_path, '/', 2) = 'ADV'
        AND split_part(p.full_path, '/', 3) LIKE 'ADV %'
      GROUP BY 1
    `),
  ]);

  const months = new Map<string, MonthlyDatum>();
  const advTotals = new Map<string, number>();
  for (const r of advRows) {
    if (!months.has(r.month)) months.set(r.month, { month: r.month, events: {}, duration: {}, users: 0 });
    const m = months.get(r.month)!;
    m.events[r.adv] = (m.events[r.adv] ?? 0) + r.events;
    m.duration[r.adv] = (m.duration[r.adv] ?? 0) + r.duration;
    advTotals.set(r.adv, (advTotals.get(r.adv) ?? 0) + r.events);
  }
  for (const r of userRows) {
    if (!months.has(r.month)) months.set(r.month, { month: r.month, events: {}, duration: {}, users: 0 });
    months.get(r.month)!.users = r.users;
  }
  const advs = [...advTotals.entries()].sort((a, b) => b[1] - a[1]).map(([adv]) => adv);
  const data = [...months.values()].sort((a, b) => a.month.localeCompare(b.month));
  for (const row of data) {
    for (const adv of advs) {
      if (row.events[adv] === undefined) row.events[adv] = 0;
      if (row.duration[adv] === undefined) row.duration[adv] = 0;
    }
  }
  return { data, advs };
}

export async function getTopCountries(f: Filters, limit = 10) {
  const rows = await db.execute<{ country: string; events: number }>(sql`
    SELECT c.name AS country, COUNT(*)::int AS events
    FROM events e
    JOIN users u     ON u.id = e.user_id
    JOIN countries c ON c.id = u.country_id
    WHERE ${rangeClause(f)} AND ${countryClause(f)}
    GROUP BY c.name
    ORDER BY events DESC
    LIMIT ${limit}
  `);
  return rows;
}

export async function getTopUsers(f: Filters, limit = 10) {
  const rows = await db.execute<{
    user: string;
    country: string;
    events: number;
    total_duration: number;
  }>(sql`
    SELECT
      u.full_name AS "user",
      c.name      AS country,
      COUNT(*)::int AS events,
      COALESCE(SUM(e.duration_sec),0)::int AS total_duration
    FROM events e
    JOIN users u     ON u.id = e.user_id
    JOIN countries c ON c.id = u.country_id
    WHERE ${rangeClause(f)} AND ${countryClause(f)}
    GROUP BY u.full_name, c.name
    ORDER BY events DESC
    LIMIT ${limit}
  `);
  return rows;
}

export async function getTopPagesPerAdv(f: Filters, perAdv = 8) {
  const rows = await db.execute<{
    adv: string;
    page: string;
    total_duration: number;
    events: number;
    rn: number;
  }>(sql`
    WITH agg AS (
      SELECT
        split_part(p.full_path, '/', 3) AS adv,
        split_part(p.full_path, '/', 4) AS page,
        COALESCE(SUM(e.duration_sec),0)::int AS total_duration,
        COUNT(*)::int                        AS events
      FROM events e
      JOIN pages p ON p.id = e.page_id
      ${maybeUserJoin(f)}
      WHERE ${rangeClause(f)} AND ${countryClause(f)}
        AND split_part(p.full_path, '/', 2) = 'ADV'
        AND split_part(p.full_path, '/', 3) LIKE 'ADV %'
        AND split_part(p.full_path, '/', 4) <> ''
      GROUP BY 1, 2
    )
    SELECT adv, page, total_duration, events,
           ROW_NUMBER() OVER (PARTITION BY adv ORDER BY total_duration DESC)::int AS rn
    FROM agg
  `);
  const grouped = new Map<string, { page: string; total_duration: number; events: number }[]>();
  for (const r of rows) {
    if (r.rn > perAdv) continue;
    if (!grouped.has(r.adv)) grouped.set(r.adv, []);
    grouped.get(r.adv)!.push({
      page: r.page,
      total_duration: r.total_duration,
      events: r.events,
    });
  }
  return [...grouped.entries()]
    .map(([adv, pages]) => ({ adv, pages }))
    .sort((a, b) => {
      const sa = a.pages.reduce((s, p) => s + p.total_duration, 0);
      const sb = b.pages.reduce((s, p) => s + p.total_duration, 0);
      return sb - sa;
    });
}

export async function getAdvDuration(f: Filters) {
  const rows = await db.execute<{ adv: string; total_duration: number; events: number }>(sql`
    SELECT
      split_part(p.full_path, '/', 3) AS adv,
      COALESCE(SUM(e.duration_sec), 0)::int AS total_duration,
      COUNT(*)::int                         AS events
    FROM events e
    JOIN pages p ON p.id = e.page_id
    ${maybeUserJoin(f)}
    WHERE ${rangeClause(f)} AND ${countryClause(f)}
      AND split_part(p.full_path, '/', 2) = 'ADV'
      AND split_part(p.full_path, '/', 3) LIKE 'ADV %'
    GROUP BY 1
    ORDER BY total_duration DESC
  `);
  return rows;
}

export async function getDateBounds() {
  const [row] = await db.execute<{ min: string; max: string }>(sql`
    SELECT MIN(occurred_at) AS min, MAX(occurred_at) AS max FROM events
  `);
  return row;
}
