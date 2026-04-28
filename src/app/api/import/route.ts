import { NextResponse } from "next/server";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { importExcel } from "@/lib/import";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(request: Request) {
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Fichier manquant" }, { status: 400 });
  }
  if (file.size === 0) {
    return NextResponse.json({ error: "Fichier vide" }, { status: 400 });
  }
  const lower = file.name.toLowerCase();
  if (!lower.endsWith(".xlsx")) {
    return NextResponse.json({ error: "Format attendu: .xlsx" }, { status: 400 });
  }

  const dir = await mkdtemp(path.join(tmpdir(), "detailing-import-"));
  const filePath = path.join(dir, file.name);
  try {
    const buf = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, buf);
    const result = await importExcel(filePath);
    return NextResponse.json(result);
  } catch (e) {
    console.error("[import] failed", e);
    const msg = e instanceof Error ? e.message : "Erreur d'import";
    return NextResponse.json({ error: msg }, { status: 500 });
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}
