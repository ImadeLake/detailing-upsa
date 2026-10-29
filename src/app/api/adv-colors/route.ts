import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HEX = /^#[0-9a-f]{6}$/i;

// Upsert the color of one ADV.
export async function PUT(request: Request) {
  const body = await request.json().catch(() => null);
  const adv = typeof body?.adv === "string" ? body.adv.trim() : "";
  const color = typeof body?.color === "string" ? body.color : "";
  if (!adv || !HEX.test(color)) {
    return NextResponse.json({ error: "Paramètres invalides" }, { status: 400 });
  }
  await db.execute(sql`
    INSERT INTO adv_colors (adv, color, updated_at)
    VALUES (${adv}, ${color.toLowerCase()}, now())
    ON CONFLICT (adv) DO UPDATE SET color = EXCLUDED.color, updated_at = now()
  `);
  return NextResponse.json({ ok: true });
}

// Reset every ADV back to its default color.
export async function DELETE() {
  await db.execute(sql`DELETE FROM adv_colors`);
  return NextResponse.json({ ok: true });
}
