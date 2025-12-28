#!/usr/bin/env node
import { spawn } from "node:child_process";

const TIMEOUT_MS = Number(process.env.CI_SMOKE_TIMEOUT_MS || 7 * 60_000); // 7 دقیقه
const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";

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

    child.on("error", (err) => {
      clearTimeout(t);
      reject(err);
    });

    child.on("exit", (code, signal) => {
      clearTimeout(t);
      if (signal === "SIGTERM" || signal === "SIGKILL") {
        return reject(new Error("ABORTED"));
      }
      if (code === 0) return resolve();
      reject(new Error(`EXIT_${code ?? "UNKNOWN"}`));
    });
  });
}

async function main() {
  try {
    // ✅ sanity: npm باید در PATH باشد (روی GitHub Actions هست)
    await run(npmCmd, ["-v"], { timeoutMs: 30_000 });

    // اینجا “Smoke واقعی” شما را اجرا می‌کنیم.
    // اگر در پروژه‌تان اسکریپت دیگری هست، همینجا عوضش کن (ولی استاندارد: npm run …).
    //
    // مثال‌های رایج:
    // - npm -w apps/web run e2e:smoke
    // - npm run smoke
    //
    // فعلاً مطابق ساختار فعلی شما، خودش یک اسکریپت smoke را اجرا می‌کند:
    await run(npmCmd, ["run", "smoke", "--if-present"]);

    // اگر پروژه شما به Playwright نیاز دارد و install جدا لازم است، این را اضافه کن:
    // await run(npmCmd, ["exec", "--", "playwright", "install", "--with-deps"]);

    console.log("[smoke] PASS");
    process.exit(0);
  } catch (err) {
    const msg = String(err?.message || err);

    if (msg.includes("ENOENT") || msg.toLowerCase().includes("npm")) {
      console.error("[smoke] FAIL: Error: NPM_CLI_NOT_FOUND");
      console.error("[smoke] abort: exception");
      process.exit(1);
    }

    if (msg === "ABORTED") {
      console.error("[smoke] ABORTED");
      process.exit(2);
    }

    console.error(`[smoke] FAIL: ${msg}`);
    process.exit(1);
  }
}

main();
