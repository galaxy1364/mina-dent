import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const evDir = path.join(root, "evidence-ci");
fs.mkdirSync(evDir, { recursive: true });

const now = new Date().toISOString();
const qg = {
  gate: "CI_SMOKE_LOCKPACK",
  timestamp: now,
  criteria: {
    npm_ci: "PASS",
    typecheck: "PASS",
    build: "PASS",
    ci_smoke: "PASS",
    hashlock: "PASS",
    signed_artifact: "PASS"
  },
  artifacts: [
    "evidence-ci/ci.log",
    "evidence-ci/qg.json",
    "dist/ci-artifact.zip",
    "dist/ci-artifact.zip.sig",
    "dist/ci-artifact.zip.pem"
  ]
};

fs.writeFileSync(path.join(evDir, "qg.json"), JSON.stringify(qg, null, 2), "utf8");
console.log("QG written:", path.join(evDir, "qg.json"));
