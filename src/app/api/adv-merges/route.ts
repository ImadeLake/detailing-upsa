import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Create or replace the group `name` with exactly the given ADVs.
// An ADV already in another group is moved into this one.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const advs: string[] = Array.isArray(body?.advs)
    ? [...new Set<string>(body.advs.filter((a: unknown): a is string => typeof a === "string" && a.length > 0))]
    : [];
  if (!name || name.length > 80) {
    return NextResponse.json({ error: "Nom de fusion invalide" }, { status: 400 });
  }
  if (advs.length < 2) {
    return NextResponse.json({ error: "Sélectionne au moins 2 produits" }, { status: 400 });
  }

  // The group name must not hijack an existing product that isn't part of it.
  const [clash] = await db.execute<{ adv: string }>(sql`
    SELECT split_part(full_path, '/', 3) AS adv
    FROM pages
    WHERE split_part(full_path, '/', 2) = 'ADV'
      AND split_part(full_path, '/', 3) = ${name}
    LIMIT 1
  `);
  if (clash && !advs.includes(name)) {
    return NextResponse.json(
      { error: `« ${name} » est déjà le nom d'un produit non sélectionné` },
      { status: 400 },
    );
  }

  const values = sql.join(
    advs.map((adv) => sql`(${adv}, ${name})`),
    sql`, `,
  );
  await db.transaction(async (tx) => {
    await tx.execute(sql`DELETE FROM adv_merges WHERE target = ${name}`);
    await tx.execute(sql`
      INSERT INTO adv_merges (adv, target) VALUES ${values}
      ON CONFLICT (adv) DO UPDATE SET target = EXCLUDED.target
    `);
  });
  return NextResponse.json({ ok: true });
}

// Dissolve one group (?name=…). Only that group's rows are removed.
export async function DELETE(request: Request) {
  const name = new URL(request.url).searchParams.get("name")?.trim();
  if (!name) {
    return NextResponse.json({ error: "Nom de fusion manquant" }, { status: 400 });
  }
  await db.execute(sql`DELETE FROM adv_merges WHERE target = ${name}`);
  return NextResponse.json({ ok: true });
}
