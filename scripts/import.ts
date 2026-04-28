import { config } from "dotenv";
config({ path: ".env.local" });

import path from "node:path";
import { importExcel } from "../src/lib/import";

const DEFAULT_FILE = "../Statistiques Logs 01-01-2026 31-03-2026.xlsx";

async function main() {
  const fileArg = process.argv[2] ?? DEFAULT_FILE;
  const filePath = path.resolve(fileArg);
  console.log(`Importing ${filePath}`);

  const r = await importExcel(filePath, {
    onProgress: (n) => {
      if (n % 20000 === 0) console.log(`  ${n} rows`);
    },
  });
  const dt = (r.durationMs / 1000).toFixed(1);
  console.log(`Done. seen=${r.seen} inserted=${r.inserted} skipped=${r.skipped} in ${dt}s`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
