/**
 * LOCKPACK Guard: Prisma must be pinned in package-lock.json
 */
const fs = require("node:fs");
function fail(msg){ console.error(msg); process.exit(1); }

const p="package-lock.json";
if(!fs.existsSync(p)) fail("package-lock.json not found at repo root");

let lock;
try { lock = JSON.parse(fs.readFileSync(p,"utf8")); } catch { fail("failed to parse package-lock.json"); }

const v = lock?.packages?.["node_modules/prisma"]?.version || lock?.dependencies?.prisma?.version;
if(!v) fail("prisma not in lockfile (add prisma as devDependency and regenerate lockfile)");

console.log("prisma(lock):", v);
process.exit(0);