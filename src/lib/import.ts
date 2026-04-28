import ExcelJS from "exceljs";
import postgres from "postgres";

export type ImportResult = {
  seen: number;
  inserted: number;
  skipped: number;
  durationMs: number;
};

function excelSerialToDate(serial: number): Date {
  // Excel serial -> Date. 25569 = days between 1900-01-01 and 1970-01-01
  // (accounts for Excel's leap-year-1900 bug).
  const ms = Math.round((serial - 25569) * 86400 * 1000);
  return new Date(ms);
}

function parseGroup(g: string): { role: string; country: string } | null {
  if (!g) return null;
  const trimmed = g.trim();
  if (!trimmed.includes("/")) return null;
  const [role, country] = trimmed.split("/").map((s) => s.trim());
  if (!role || !country) return null;
  return { role, country };
}

function isUnavailablePath(p: string): boolean {
  return /^Ƶ Not available anymore/i.test(p) || /Not available anymore \(Id =/i.test(p);
}

export async function importExcel(
  source: string | Buffer | NodeJS.ReadableStream,
  opts: { onProgress?: (n: number) => void } = {},
): Promise<ImportResult> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const sql = postgres(url, { max: 5 });

  const countryCache = new Map<string, number>();
  const roleCache = new Map<string, number>();
  const userCache = new Map<string, number>();
  const pageCache = new Map<string, number>();

  for (const r of await sql<{ id: number; name: string }[]>`SELECT id, name FROM countries`)
    countryCache.set(r.name, r.id);
  for (const r of await sql<{ id: number; name: string }[]>`SELECT id, name FROM roles`)
    roleCache.set(r.name, r.id);
  for (const r of await sql<{ id: number; full_name: string; role_id: number; country_id: number }[]>`
    SELECT id, full_name, role_id, country_id FROM users
  `) {
    userCache.set(`${r.full_name}|${r.role_id}|${r.country_id}`, r.id);
  }
  for (const r of await sql<{ id: number; full_path: string }[]>`SELECT id, full_path FROM pages`) {
    pageCache.set(r.full_path, r.id);
  }

  async function getCountryId(name: string): Promise<number> {
    let id = countryCache.get(name);
    if (id) return id;
    const [row] = await sql<{ id: number }[]>`
      INSERT INTO countries (name) VALUES (${name})
      ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
      RETURNING id
    `;
    id = row.id;
    countryCache.set(name, id);
    return id;
  }
  async function getRoleId(name: string): Promise<number> {
    let id = roleCache.get(name);
    if (id) return id;
    const [row] = await sql<{ id: number }[]>`
      INSERT INTO roles (name) VALUES (${name})
      ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
      RETURNING id
    `;
    id = row.id;
    roleCache.set(name, id);
    return id;
  }
  async function getUserId(fullName: string, roleId: number, countryId: number): Promise<number> {
    const key = `${fullName}|${roleId}|${countryId}`;
    let id = userCache.get(key);
    if (id) return id;
    const [row] = await sql<{ id: number }[]>`
      INSERT INTO users (full_name, role_id, country_id)
      VALUES (${fullName}, ${roleId}, ${countryId})
      ON CONFLICT (full_name, role_id, country_id) DO UPDATE SET full_name = EXCLUDED.full_name
      RETURNING id
    `;
    id = row.id;
    userCache.set(key, id);
    return id;
  }
  async function getPageId(fullPath: string): Promise<number> {
    const cached = pageCache.get(fullPath);
    if (cached) return cached;
    const segments = fullPath.split("/");
    const unavailable = isUnavailablePath(fullPath);
    let parentId: number | null = null;
    let cumulative = "";
    for (let i = 0; i < segments.length; i++) {
      cumulative = i === 0 ? segments[0] : `${cumulative}/${segments[i]}`;
      const c = pageCache.get(cumulative);
      if (c) {
        parentId = c;
        continue;
      }
      const rows = await sql<{ id: number }[]>`
        INSERT INTO pages (parent_id, segment, full_path, depth, is_unavailable)
        VALUES (${parentId}, ${segments[i]}, ${cumulative}, ${i + 1}, ${unavailable && i === segments.length - 1})
        ON CONFLICT (full_path) DO UPDATE SET full_path = EXCLUDED.full_path
        RETURNING id
      `;
      const newId: number = rows[0].id;
      pageCache.set(cumulative, newId);
      parentId = newId;
    }
    return parentId!;
  }

  const wb = new ExcelJS.stream.xlsx.WorkbookReader(source as never, {
    entries: "emit",
    sharedStrings: "cache",
    hyperlinks: "ignore",
    styles: "ignore",
  });

  const BATCH = 2000;
  let pending: {
    occurred_at: Date;
    user_id: number;
    page_id: number;
    duration_sec: number;
    is_offline: boolean;
  }[] = [];
  let inserted = 0;
  let seen = 0;
  let skipped = 0;
  const t0 = Date.now();

  async function flush() {
    if (pending.length === 0) return;
    await sql`
      INSERT INTO events ${sql(pending, "occurred_at", "user_id", "page_id", "duration_sec", "is_offline")}
      ON CONFLICT (occurred_at, user_id, page_id) DO NOTHING
    `;
    inserted += pending.length;
    pending = [];
    opts.onProgress?.(inserted);
  }

  try {
    for await (const worksheetReader of wb as AsyncIterable<AsyncIterable<ExcelJS.Row>>) {
      let firstRow = true;
      for await (const row of worksheetReader) {
        if (firstRow) {
          firstRow = false;
          continue;
        }
        seen++;
        const values = row.values as (Date | string | number | boolean | null | undefined)[];
        const dateRaw = values[1];
        const group = (values[2] as string | undefined) ?? "";
        const userName = (values[3] as string | undefined) ?? "";
        const page = (values[4] as string | undefined) ?? "";
        const durationRaw = values[5];
        const offlineRaw = values[6];

        let date: Date | null = null;
        if (dateRaw instanceof Date) date = dateRaw;
        else if (typeof dateRaw === "number") date = excelSerialToDate(dateRaw);

        if (!date || !page) {
          skipped++;
          continue;
        }
        const parsed = parseGroup(group);
        if (!parsed) {
          skipped++;
          continue;
        }

        const duration = Math.max(0, Math.round(Number(durationRaw) || 0));
        const offline = Boolean(offlineRaw);

        const roleId = await getRoleId(parsed.role);
        const countryId = await getCountryId(parsed.country);
        const userId = await getUserId(userName, roleId, countryId);
        const pageId = await getPageId(page);

        pending.push({
          occurred_at: date,
          user_id: userId,
          page_id: pageId,
          duration_sec: duration,
          is_offline: offline,
        });

        if (pending.length >= BATCH) await flush();
      }
    }
    await flush();
  } finally {
    await sql.end();
  }

  return { seen, inserted, skipped, durationMs: Date.now() - t0 };
}
