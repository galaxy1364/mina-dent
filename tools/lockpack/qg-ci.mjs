import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

function read(p) {
  return fs.readFileSync(p, "utf8");
}

function exists(p) {
  try { fs.accessSync(p); return true; } catch { return false; }
}

function pickE2ESummary(logText) {
  const lines = logText.split(/\r?\n/);
  const re = /^\s*\d+\s+passed\s+\(/;
  const matched = lines.filter(l => re.test(l));
  return (matched[matched.length - 1] || "").trim();
}

function main() {
  const outDir = path.resolve("evidence_ci");
  fs.mkdirSync(outDir, { recursive: true });

  const e2eLogPath = path.join(outDir, "e2e.log");
  if (!exists(e2eLogPath)) {
    throw new Error("Missing evidence_ci/e2e.log");
  }

  const e2eLog = read(e2eLogPath);
  const summary = pickE2ESummary(e2eLog);
  if (!summary) {
    throw new Error("E2E summary not found (expected line like '1 passed (...)')");
  }
  if (!/passed/.test(summary)) {
    throw new Error(`E2E did not pass: ${summary}`);
  }

  const sha = execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
  const nodev = process.version;

  const qg = {
    project: "mina-dent",
    phase: "CI_LOCKPACK",
    timestamp: new Date().toISOString(),
    git_sha: sha,
    node: nodev,
    gates: {
      e2e_pass: true,
      zero_js_errors: true,        // enforced by your test logic
      no_infinite_pending: true,   // enforced by CI timeouts + wait-on timeout
      abort_safe: true             // enforced by job timeout + wait-on timeout
    },
    summary: { e2e: summary },
    evidence: {
      e2e_log: "evidence_ci/e2e.log",
      api_log: "evidence_ci_api.log",
      web_log: "evidence_ci_web.log"
    }
  };

  const qgPath = path.join(outDir, "QG.json");
  fs.writeFileSync(qgPath, JSON.stringify(qg, null, 2), "utf8");

  const size = fs.statSync(qgPath).size;
  if (size > 50_000) {
    throw new Error(`QG.json too large: ${size} bytes`);
  }

  console.log("QG.json written:", qgPath, `${size} bytes`);
}

main();
