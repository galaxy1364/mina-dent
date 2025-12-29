#!/usr/bin/env node
import { spawn } from "node:child_process";

const TIMEOUT_MS = Number(process.env.CI_SMOKE_TIMEOUT_MS || 7 * 60_000); // 7 دقیقه
const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";

function out(msg) {
  process.stdout.write(String(msg) + "\n");
}
function err(msg) {
  process.stderr.write(String(msg) + "\n");
}

function run(cmd, args, { timeoutMs = TIMEOUT_MS } = {}) {
  return new Promise((resolve, reject) => {
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), timeoutMs);

    const child = spawn(cmd, args, {
      stdio: "inherit",
      shell: false,
      signal: ac.signal,
      env: process.env,
    });

    child.on("error", (e) => {
      clearTimeout(t);
      reject(e);
    });

    child.on("exit", (code, signal) => {
      clearTimeout(t);

      // AbortController typically results in SIGTERM; treat as ABORTED.
      if (signal) return reject(new Error("ABORTED"));
      if (code === 0) return resolve();

      reject(new Error(`EXIT_${code ?? "UNKNOWN"}`));
    });
  });
}

function classifyFailureMessage(message) {
  const m = String(message || "");

  // ENOENT: command not found (npm missing in PATH)
  if (m.includes("ENOENT")) return "NPM_CLI_NOT_FOUND";

  // Some platforms: spawn npm ENOENT message can include the word npm
  const lower = m.toLowerCase();
  if (lower.includes("npm") && lower.includes("not found")) return "NPM_CLI_NOT_FOUND";

  return null;
}

async function main() {
  try {
    // sanity: npm باید در PATH باشد (روی GitHub Actions هست)
    await run(npmCmd, ["-v"], { timeoutMs: 30_000 });

    // Smoke واقعی پروژه (اگر اسکریپت smoke نبود، به‌صورت safe نادیده گرفته می‌شود)
    await run(npmCmd, ["run", "smoke", "--if-present"]);

    out("[smoke] PASS");
    process.exit(0);
  } catch (e) {
    const msg = String(e?.message || e);

    if (msg === "ABORTED") {
      err("[smoke] ABORTED");
      process.exit(2);
    }

    const classified = classifyFailureMessage(msg);
    if (classified === "NPM_CLI_NOT_FOUND") {
      err("[smoke] FAIL: NPM CLI not found");
      err("[smoke] abort: exception");
      process.exit(1);
    }

    err(`[smoke] FAIL: ${msg}`);
    process.exit(1);
  }
}

main();
