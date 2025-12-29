import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawn } from "node:child_process";

const ROOT = process.cwd();
const ARTIFACTS_DIR = path.join(ROOT, "artifacts");
const QG_PATH = path.join(ARTIFACTS_DIR, "QG.json");
const MANIFEST_PATH = path.join(ARTIFACTS_DIR, "manifest.json");

const nowIso = () => new Date().toISOString();

function ensureDir(p) { fs.mkdirSync(p, { recursive: true }); }

function readIfExists(p) { try { return fs.readFileSync(p); } catch { return null; } }

function sha256(buf) { return crypto.createHash("sha256").update(buf).digest("hex"); }

function sha256File(p) { const b = readIfExists(p); return b ? sha256(b) : null; }

function walkFiles(dirAbs) {
  const out = [];
  if (!fs.existsSync(dirAbs)) return out;
  const stack = [dirAbs];
  while (stack.length) {
    const cur = stack.pop();
    const entries = fs.readdirSync(cur, { withFileTypes: true });
    for (const e of entries) {
      const abs = path.join(cur, e.name);
      if (e.isDirectory()) stack.push(abs);
      else if (e.isFile()) out.push(abs);
    }
  }
  return out;
}

function rel(p) { return path.relative(ROOT, p).replaceAll("\\\\", "/"); }

function writeJson(p, obj) { fs.writeFileSync(p, JSON.stringify(obj, null, 2) + "\n", "utf8"); }

function getCommitSha() {
  const head = readIfExists(path.join(ROOT, ".git/HEAD"));
  if (!head) return null;
  const s = head.toString("utf8").trim();
  if (s.startsWith("ref:")) {
    const ref = s.replace("ref:", "").trim();
    const refPath = path.join(ROOT, ".git", ref);
    const refVal = readIfExists(refPath);
    return refVal ? refVal.toString("utf8").trim() : null;
  }
  return s;
}

function killTree(pid) {
  if (!pid) return;
  try {
    if (process.platform === "win32") {
      spawn("taskkill", ["/PID", String(pid), "/T", "/F"], { stdio: "ignore" });
    } else {
      process.kill(-pid, "SIGKILL");
    }
  } catch {
    try { process.kill(pid, "SIGKILL"); } catch {}
  }
}

async function runStep({ id, title, cmd, args, cwd, timeoutMs, env }) {
  const startedAt = Date.now();
  const step = {
    id, title,
    cmd: [cmd, ...args].join(" "),
    cwd: cwd ? rel(cwd) : ".",
    timeoutMs,
    startedAt: new Date(startedAt).toISOString(),
    endedAt: null,
    durationMs: null,
    status: "RUNNING",
    exitCode: null,
    signal: null,
    stdout: "",
    stderr: ""
  };

  let child = null;
  let timeout = null;

  const finalize = (status, exitCode = null, signal = null) => {
    const endedAt = Date.now();
    step.endedAt = new Date(endedAt).toISOString();
    step.durationMs = endedAt - startedAt;
    step.status = status;
    step.exitCode = exitCode;
    step.signal = signal;
  };

  try {
    await new Promise((resolve) => {
            // win-npm-wrap: run npm via cmd.exe on Windows to avoid .cmd spawn issues
      let realCmd = cmd;
      let realArgs = args;
      if (process.platform === "win32" && (cmd === "npm" || cmd === "npm.cmd")) {
        realCmd = process.env.comspec || "cmd.exe";
        realArgs = ["/d", "/s", "/c", "npm", ...args];
      }
      child = spawn(realCmd, realArgs, {
        cwd: cwd ?? ROOT,
        env: { ...process.env, ...(env ?? {}) },
        stdio: ["ignore", "pipe", "pipe"],
        windowsHide: true,
        detached: process.platform !== "win32"
      });

      const onAbort = () => {
        finalize("ABORTED");
        try { killTree(child?.pid); } finally { resolve(); }
      };

      const onSigInt = () => onAbort();
      const onSigTerm = () => onAbort();

      process.once("SIGINT", onSigInt);
      process.once("SIGTERM", onSigTerm);

      child.stdout.on("data", (d) => (step.stdout += d.toString()));
      child.stderr.on("data", (d) => (step.stderr += d.toString()));

      timeout = setTimeout(() => {
        finalize("FAIL");
        step.stderr += `\n[lockpack] TIMEOUT after ${timeoutMs}ms\n`;
        killTree(child.pid);
        resolve();
      }, timeoutMs);

      child.on("close", (code, sig) => {
        if (step.status === "ABORTED") {
          // already finalized
        } else if (code === 0) {
          finalize("PASS", code, sig ?? null);
        } else {
          finalize("FAIL", code ?? null, sig ?? null);
        }
        resolve();
      });

      child.on("error", (err) => {
        step.stderr += `\n[lockpack] spawn error: ${String(err?.message ?? err)}\n`;
        finalize("FAIL");
        resolve();
      });

      child.on("exit", () => {
        clearTimeout(timeout);
        process.removeListener("SIGINT", onSigInt);
        process.removeListener("SIGTERM", onSigTerm);
      });
    });
  } finally {
    if (timeout) clearTimeout(timeout);
  }

  return step;
}

function computeOverall(steps) {
  const anyFail = steps.some((s) => s.status === "FAIL");
  const anyRunning = steps.some((s) => s.status === "RUNNING");
  const anyPending = steps.some((s) => s.status === "PENDING");
  const anyCapturing = steps.some((s) => s.status === "CAPTURING");
  const anyAborted = steps.some((s) => s.status === "ABORTED");
  if (anyFail) return "FAIL";
  if (anyRunning || anyPending || anyCapturing) return "PENDING";
  if (anyAborted) return "WARN";
  return "PASS";
}

function buildManifest() {
  const targets = [
    "package.json",
    "package-lock.json",
    "pnpm-lock.yaml",
    "yarn.lock",
    "apps/web/package.json",
    "apps/api/package.json",
    "apps/web/.next",
    "apps/api/dist",
    "apps/web/playwright-report",
    "apps/web/test-results"
  ];

  const files = [];
  for (const t of targets) {
    const abs = path.join(ROOT, t);
    if (!fs.existsSync(abs)) continue;
    const st = fs.statSync(abs);
    if (st.isFile()) {
      files.push({ path: rel(abs), bytes: st.size, sha256: sha256File(abs) });
    } else if (st.isDirectory()) {
      for (const f of walkFiles(abs)) {
        const fst = fs.statSync(f);
        files.push({ path: rel(f), bytes: fst.size, sha256: sha256File(f) });
      }
    }
  }
  files.sort((a, b) => a.path.localeCompare(b.path));
  return { generatedAt: nowIso(), root: rel(ROOT), fileCount: files.length, files };
}

async function main() {
  ensureDir(ARTIFACTS_DIR);

  const qg = {
    schema: "LOCKPACK-QG-1",
    generatedAt: nowIso(),
    commitSha: getCommitSha(),
    node: process.version,
    platform: `${process.platform}/${process.arch}`,
    locks: {
      lockfileSha256:
        sha256File(path.join(ROOT, "package-lock.json")) ||
        sha256File(path.join(ROOT, "pnpm-lock.yaml")) ||
        sha256File(path.join(ROOT, "yarn.lock")) ||
        null
    },
    steps: [],
    overall: "PENDING"
  };

  qg.steps.push(await runStep({
    id: "clean",
    title: "Clean artifacts/outputs",
    cmd: process.execPath,
    args: [path.join(ROOT, "scripts/lockpack-artifacts-clean.mjs")],
    timeoutMs: 60_000
  }));

  qg.steps.push(await runStep({
    id: "install",
    title: "Install (npm ci)",
    cmd: (process.platform === "win32" ? "npm.cmd" : "npm"),
    args: ["ci"],
    timeoutMs: 10 * 60_000
  }));

  qg.steps.push(await runStep({
    id: "lint",
    title: "Lint (all workspaces)",
    cmd: (process.platform === "win32" ? "npm.cmd" : "npm"),
    args: ["run", "-s", "lint"],
    timeoutMs: 5 * 60_000
  }));

  qg.steps.push(await runStep({
    id: "typecheck",
    title: "Typecheck (all workspaces)",
    cmd: (process.platform === "win32" ? "npm.cmd" : "npm"),
    args: ["run", "-s", "typecheck"],
    timeoutMs: 5 * 60_000
  }));

  qg.steps.push(await runStep({
    id: "test",
    title: "Test (all workspaces)",
    cmd: (process.platform === "win32" ? "npm.cmd" : "npm"),
    args: ["run", "-s", "test"],
    timeoutMs: 10 * 60_000
  }));

  qg.steps.push(await runStep({
    id: "build",
    title: "Build (all workspaces)",
    cmd: (process.platform === "win32" ? "npm.cmd" : "npm"),
    args: ["run", "-s", "build"],
    timeoutMs: 15 * 60_000
  }));

  qg.steps.push(await runStep({
    id: "e2e",
    title: "E2E (Playwright)",
    cmd: process.execPath,
    args: [path.join(ROOT, "scripts/lockpack-e2e.mjs")],
    timeoutMs: 20 * 60_000,
    env: { CI: "1" }
  }));
qg.steps.push(await runStep({
    id: "security",
    title: "Security (npm audit --omit=dev)",
    cmd: (process.platform === "win32" ? "npm.cmd" : "npm"),
    args: ["audit", "--omit=dev"],
    timeoutMs: 5 * 60_000
  }));

  ensureDir(ARTIFACTS_DIR);
  writeJson(MANIFEST_PATH, buildManifest());
  qg.overall = computeOverall(qg.steps);
  writeJson(QG_PATH, qg);

  console.log(`[lockpack] overall=${qg.overall}`);
  console.log(`[lockpack] wrote ${rel(QG_PATH)}`);
  console.log(`[lockpack] wrote ${rel(MANIFEST_PATH)}`);

  if (qg.overall !== "PASS") process.exitCode = 1;
}

main().catch((e) => {
  ensureDir(ARTIFACTS_DIR);
  writeJson(QG_PATH, {
    schema: "LOCKPACK-QG-1",
    generatedAt: nowIso(),
    fatal: true,
    message: String(e?.message ?? e),
    stack: String(e?.stack ?? "")
  });
  process.stderr.write(`[lockpack] fatal: ${(e && e.stack) ? e.stack : e}\n`);
  process.exitCode = 1;
});







