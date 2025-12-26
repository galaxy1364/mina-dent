import { spawn } from "node:child_process";

const API_BASE_URL = process.env.API_BASE_URL ?? "http://127.0.0.1:3001";
const WEB_BASE_URL = process.env.WEB_BASE_URL ?? "http://127.0.0.1:3000";

function run(cmd, args, opts = {}) {
  return spawn(cmd, args, { stdio: "inherit", shell: false, ...opts });
}
function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  {
    const p = run("npm", ["-w", "apps/api", "run", "build:seed"]);
    const code = await new Promise((r) => p.on("close", r));
    if (code !== 0) process.exit(code);
  }

  {
    const p = run("npm", ["run", "build"]);
    const code = await new Promise((r) => p.on("close", r));
    if (code !== 0) process.exit(code);
  }

  const api = run("npm", ["-w", "apps/api", "run", "start"], {
    env: { ...process.env, PORT: "3001" }
  });

  await wait(1500);

  const seed = run("node", ["apps/api/dist/seed.js"], { env: process.env });
  {
    const code = await new Promise((r) => seed.on("close", r));
    if (code !== 0) process.exit(code);
  }

  const web = run("npm", ["-w", "apps/web", "run", "start"], {
    env: { ...process.env, PORT: "3000", API_BASE_URL }
  });

  await wait(1500);

  const pw = run("npm", ["-w", "apps/web", "run", "test:e2e"], {
    env: { ...process.env, WEB_BASE_URL, API_BASE_URL }
  });

  const code = await new Promise((r) => pw.on("close", r));

  api.kill("SIGTERM");
  web.kill("SIGTERM");

  process.exit(code);
}

main().catch((e) => {
  process.stderr.write(String(e) + "\n");
  process.exit(1);
});
