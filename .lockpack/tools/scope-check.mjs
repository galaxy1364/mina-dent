#!/usr/bin/env node
import { execSync } from "node:child_process";
import fs from "node:fs";

const state = JSON.parse(fs.readFileSync(".lockpack/STATE.json","utf8"));
const allow = (state && state.scope && Array.isArray(state.scope.allow)) ? state.scope.allow : [];

function allowed(f) {
  return allow.some(a => {
    if (a.endsWith("/**")) return f.startsWith(a.slice(0,-3));
    return f === a;
  });
}

function sh(cmd){
  return execSync(cmd, { encoding: "utf8", stdio: ["ignore","pipe","pipe"] }).trim();
}

try {
  const baseRef = process.env.GITHUB_BASE_REF;
  let files = [];

  if (baseRef) {
    // Fail-closed but robust: ensure full history so merge-base exists
    try {
      if (fs.existsSync(".git/shallow")) {
        sh("git fetch --unshallow --no-tags origin");
      }
    } catch (e) {
      sh("git fetch --no-tags --prune origin");
    }

    sh(`git fetch --no-tags --prune origin ${baseRef}`);

    let mb = "";
    try {
      mb = sh(`git merge-base origin/${baseRef} HEAD`);
    } catch (e) {
      console.error("LOCKPACK_SCOPE: no merge base (shallow history or wrong ref). Ensure checkout fetch-depth: 0");
      process.exit(1);
    }

    const out = sh(`git diff --name-only ${mb}..HEAD`);
    files = out ? out.split(/\\r?\\n/).filter(Boolean) : [];
  } else {
    const out = sh("git diff --name-only HEAD^..HEAD");
    files = out ? out.split(/\\r?\\n/).filter(Boolean) : [];
  }

  const bad = files.filter(f => !allowed(f));
  if (bad.length) {
    console.error("LOCKPACK_SCOPE: violation (outside allowlist): " + bad.join(", "));
    process.exit(1);
  }

  console.log("LOCKPACK_SCOPE: OK");
} catch (e) {
  console.error("LOCKPACK_SCOPE: failed");
  process.exit(1);
}
