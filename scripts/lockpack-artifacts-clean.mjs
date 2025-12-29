import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function rm(p) {
  const abs = path.join(ROOT, p);
  if (!fs.existsSync(abs)) return;
  fs.rmSync(abs, { recursive: true, force: true });
}

rm("artifacts");
rm("apps/web/playwright-report");
rm("apps/web/test-results");
rm("apps/web/.playwright");
rm("apps/web/.next");
rm("apps/api/dist");

console.log("[lockpack] cleaned artifacts + common build/test outputs");
