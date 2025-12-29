import { spawn } from "node:child_process";
import net from "node:net";
import path from "node:path";

const ROOT = process.cwd();
const isWin = process.platform === "win32";
const COMSPEC = process.env.comspec || "cmd.exe";

const host = "127.0.0.1";
const apiPort = 3001;
const webPort = 3000;

function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }

async function waitPort(port, timeoutMs){
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const ok = await new Promise((resolve) => {
      const s = net.createConnection({ host, port });
      s.once("connect", () => { s.end(); resolve(true); });
      s.once("error", () => resolve(false));
    });
    if (ok) return true;
    await sleep(250);
  }
  return false;
}

function killTree(pid){
  if (!pid) return;
  try {
    if (isWin) spawn(COMSPEC, ["/d","/s","/c", `taskkill /PID ${pid} /T /F`], { stdio: "ignore", windowsHide: true });
    else { try { process.kill(-pid, "SIGKILL"); } catch {} try { process.kill(pid, "SIGKILL"); } catch {} }
  } catch {}
}

function run(cmd, args, env){
  return spawn(cmd, args, {
    cwd: ROOT,
    env: { ...process.env, ...(env ?? {}) },
    stdio: "inherit",
    windowsHide: true,
    detached: !isWin
  });
}

async function main(){
  // API (assumes `npm run build` created dist/)
  const api = run(
    isWin ? COMSPEC : "node",
    isWin ? ["/d","/s","/c","node","apps/api/dist/main.js"] : ["apps/api/dist/main.js"],
    { PORT: String(apiPort), HOST: host, NODE_ENV: "test" }
  );

  // Web (assumes `npm run build` created .next/)
  const web = run(
    isWin ? COMSPEC : "node",
    isWin
      ? ["/d","/s","/c","node", path.join("node_modules","next","dist","bin","next"), "start", "-p", String(webPort)]
      : [path.join("node_modules","next","dist","bin","next"), "start", "-p", String(webPort)],
    { NODE_ENV: "test" }
  );

  const cleanup = () => { killTree(web.pid); killTree(api.pid); };
  process.once("SIGINT", cleanup);
  process.once("SIGTERM", cleanup);

  const apiUp = await waitPort(apiPort, 60_000);
  const webUp = await waitPort(webPort, 60_000);
  if (!apiUp || !webUp) {
    cleanup();
    console.error(`[lockpack-e2e] servers not ready: api=${apiUp} web=${webUp}`);
    process.exitCode = 1;
    return;
  }

  const test = run(
    isWin ? COMSPEC : "npm",
    isWin
      ? ["/d","/s","/c","npm","-w","apps/web","run","-s","test:e2e","--","--reporter=line"]
      : ["-w","apps/web","run","-s","test:e2e","--","--reporter=line"],
    { CI: "1" }
  );

  const code = await new Promise((resolve)=>test.on("close",(c)=>resolve(c ?? 1)));
  cleanup();
  process.exitCode = code === 0 ? 0 : 1;
}

main().catch((e)=>{ console.error("[lockpack-e2e] fatal:", e); process.exitCode = 1; });
