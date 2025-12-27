import net from "node:net";
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

const API_BASE_URL = process.env.API_BASE_URL ?? "http://127.0.0.1:3001";
const WEB_BASE_URL = process.env.WEB_BASE_URL ?? "http://127.0.0.1:3000";

const TIMEOUT_MS = Number(process.env.SMOKE_TIMEOUT_MS ?? 12 * 60 * 1000);
const STEP_TIMEOUT_MS = Number(process.env.SMOKE_STEP_TIMEOUT_MS ?? 6 * 60 * 1000);

function sleep(ms, signal) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    const onAbort = () => {
      clearTimeout(t);
      reject(Object.assign(new Error("ABORTED"), { code: "ABORTED" }));
    };
    if (signal) {
      if (signal.aborted) return onAbort();
      signal.addEventListener("abort", onAbort, { once: true });
    }
  });
}

async function assertPortFree(port, host = "127.0.0.1") {
  await new Promise((resolve, reject) => {
    const s = net.createServer();
    s.once("error", reject);
    s.listen(port, host, () => s.close(resolve));
  }).catch(() => {
    throw Object.assign(new Error(`PORT_IN_USE:${host}:${port}`), { code: "FAIL" });
  });
}

function safeKill(proc, name) {
  try {
    if (proc && !proc.killed) proc.kill("SIGTERM");
  } catch (e) {
    process.stderr.write(`[smoke] kill ${name} failed: ${String(e)}\n`);
  }
}

function resolveNpmCli() {
  const nodeDir = path.dirname(process.execPath);
  const candidate = path.join(nodeDir, "node_modules", "npm", "bin", "npm-cli.js");
  if (fs.existsSync(candidate)) return candidate;
  try {
    return require.resolve("npm/bin/npm-cli.js");
  } catch {
    return null;
  }
}

function spawnProc(cmd, args, { env, cwd, signal } = {}) {
  const p = spawn(cmd, args, { stdio: "inherit", shell: false, env, cwd });

  // CRITICAL: always handle error event (Zero JS runtime errors)
  p.on("error", () => {});

  if (signal) {
    const onAbort = () => safeKill(p, cmd);
    if (signal.aborted) onAbort();
    else signal.addEventListener("abort", onAbort, { once: true });
  }

  return p;
}

function waitProc(p, { name, timeoutMs, signal } = {}) {
  return new Promise((resolve, reject) => {
    let done = false;

    const finish = (value, isErr) => {
      if (done) return;
      done = true;
      if (isErr) reject(value);
      else resolve(value);
    };

    const t =
      timeoutMs != null
        ? setTimeout(() => {
            try {
              safeKill(p, name ?? "proc");
            } finally {
              finish(Object.assign(new Error(`TIMEOUT:${name ?? "proc"}`), { code: "ABORTED" }), true);
            }
          }, timeoutMs)
        : null;

    const clear = () => {
      if (t) clearTimeout(t);
    };

    p.once("error", (e) => {
      clear();
      finish(Object.assign(new Error(`${name ?? "proc"}: ${String(e)}`), { code: "FAIL" }), true);
    });

    p.once("close", (code, sig) => {
      clear();
      if (signal?.aborted) {
        finish({ code: "ABORTED", exitCode: code, signal: sig }, false);
        return;
      }
      finish({ code: code === 0 ? "PASS" : "FAIL", exitCode: code, signal: sig }, false);
    });

    if (signal) {
      const onAbort = () => safeKill(p, name ?? "proc");
      if (signal.aborted) onAbort();
      else signal.addEventListener("abort", onAbort, { once: true });
    }
  });
}

async function runNpm(npmCli, args, { env, cwd, signal, timeoutMs, name } = {}) {
  const p = spawnProc(process.execPath, [npmCli, ...args], { env, cwd, signal });
  const res = await waitProc(p, { name: name ?? `npm ${args.join(" ")}`, timeoutMs, signal });
  if (res.code === "FAIL") process.exit(res.exitCode ?? 1);
  return res;
}

async function runNode(args, { env, cwd, signal, timeoutMs, name } = {}) {
  const p = spawnProc(process.execPath, args, { env, cwd, signal });
  const res = await waitProc(p, { name: name ?? `node ${args.join(" ")}`, timeoutMs, signal });
  if (res.code === "FAIL") process.exit(res.exitCode ?? 1);
  return res;
}

async function main() {
  const ac = new AbortController();
  const signal = ac.signal;

  const procs = { api: null, web: null };

  const abortAll = (why) => {
    process.stderr.write(`[smoke] abort: ${why}\n`);
    try {
      ac.abort();
    } catch {}
    safeKill(procs.api, "api");
    safeKill(procs.web, "web");
  };

  process.once("SIGINT", () => abortAll("SIGINT"));
  process.once("SIGTERM", () => abortAll("SIGTERM"));

  process.once("unhandledRejection", (e) => {
    process.stderr.write(`[smoke] unhandledRejection: ${String(e)}\n`);
    abortAll("unhandledRejection");
    process.exit(1);
  });

  process.once("uncaughtException", (e) => {
    process.stderr.write(`[smoke] uncaughtException: ${String(e)}\n`);
    abortAll("uncaughtException");
    process.exit(1);
  });

  const globalTimer = setTimeout(() => abortAll("GLOBAL_TIMEOUT"), TIMEOUT_MS);

  try {
    const npmCli = resolveNpmCli();
    if (!npmCli) throw Object.assign(new Error("NPM_CLI_NOT_FOUND"), { code: "FAIL" });

    // Preflight: ports must be free (avoid EADDRINUSE)
    await assertPortFree(3001);
    await assertPortFree(3000);

    // Preflight: DB contract (fail-fast)
    if (!process.env.DATABASE_URL) {
      throw Object.assign(new Error("MISSING_DATABASE_URL"), { code: "FAIL" });
    }

    // ✅ Ensure schema exists in ephemeral DB BEFORE seed/runtime
    await runNpm(npmCli, ["-w", "apps/api", "run", "db:push"], {
      signal,
      timeoutMs: STEP_TIMEOUT_MS,
      name: "api db:push"
    });

    // Build steps
    await runNpm(npmCli, ["-w", "apps/api", "run", "build:seed"], {
      signal,
      timeoutMs: STEP_TIMEOUT_MS,
      name: "api build:seed"
    });

    await runNpm(npmCli, ["run", "build"], {
      signal,
      timeoutMs: STEP_TIMEOUT_MS,
      name: "workspace build"
    });

    // Start API
    procs.api = spawnProc(process.execPath, [npmCli, "-w", "apps/api", "run", "start"], {
      env: { ...process.env, PORT: "3001" },
      signal
    });

    await sleep(1500, signal);

    // Seed runtime (uses DATABASE_URL)
    await runNode(["apps/api/dist/seed.js"], {
      env: process.env,
      signal,
      timeoutMs: STEP_TIMEOUT_MS,
      name: "api dist seed"
    });

    // Start Web
    procs.web = spawnProc(process.execPath, [npmCli, "-w", "apps/web", "run", "start"], {
      env: { ...process.env, PORT: "3000", API_BASE_URL },
      signal
    });

    await sleep(1500, signal);

    // E2E
    await runNpm(npmCli, ["-w", "apps/web", "run", "test:e2e"], {
      env: { ...process.env, WEB_BASE_URL, API_BASE_URL },
      signal,
      timeoutMs: STEP_TIMEOUT_MS,
      name: "web e2e"
    });

    safeKill(procs.api, "api");
    safeKill(procs.web, "web");
    process.exit(0);
  } catch (e) {
    const exitCode = e?.code === "ABORTED" ? 130 : 1;
    process.stderr.write(`[smoke] FAIL: ${String(e)}\n`);
    abortAll("exception");
    process.exit(exitCode);
  } finally {
    clearTimeout(globalTimer);
  }
}

main();
