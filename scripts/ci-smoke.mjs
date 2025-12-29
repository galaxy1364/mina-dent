#!/usr/bin/env node
import { spawn } from "node:child_process";

const TIMEOUT_MS = Number(process.env.CI_SMOKE_TIMEOUT_MS || 7 * 60_000); // 7 minutes
const NPM_BIN = process.platform === "win32" ? "npm.cmd" : "npm";

function out(msg) {
  process.stdout.write(String(msg) + "\n");
}

function err(msg) {
  process.stderr.write(String(msg) + "\n");
}

function run(cmd, args, { timeoutMs = TIMEOUT_MS } = {}) {
  return new Promise((resolve, reject) => {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), timeoutMs);

    const child = spawn(cmd, args, {
      stdio: "inherit",
      shell: false,
      signal: ac.signal,
      env: process.env,
    });

    child.on("error", (e) => {
      clearTimeout(timer);
      reject(e);
    });

    child.on("exit", (code, signal) => {
      clearTimeout(timer);

      // Any signal -> treat as ABORTED (AbortController abort typically yields SIGTERM)
      if (signal) return reject(new Error("ABORTED"));

      if (code === 0) return resolve();
      reject(new Error(`EXIT_${code ?? "UNKNOWN"}`));
    });
  });
}

function classify(message) {
  const m = String(message || "");
  const lower = m.toLowerCase();

  // command not found
  if (m.includes("ENOENT")) return "NPM_CLI_NOT_FOUND";
  if (lower.includes("npm") && lower.includes("not found")) return "NPM_CLI_NOT_FOUND";

  return null;
}

async function main() {
  try {
    // sanity: npm must be in PATH on GitHub Actions runners
    await run(NPM_BIN, ["-v"], { timeoutMs: 30_000 });

    // project smoke (safe if missing)
    await run(NPM_BIN, ["run", "smoke", "--if-present"]);

    out("[smoke] PASS");
    process.exit(0);
  } catch (e) {
    const msg = String(e?.message || e);

    if (msg === "ABORTED") {
      err("[smoke] ABORTED");
      process.exit(2);
    }

    const kind = classify(msg);
    if (kind === "NPM_CLI_NOT_FOUND") {
      err("[smoke] FAIL: npm CLI not found");
      err("[smoke] abort: exception");
      process.exit(1);
    }

    err(`[smoke] FAIL: ${msg}`);
    process.exit(1);
  }
}

main();
