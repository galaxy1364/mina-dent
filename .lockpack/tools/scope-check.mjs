#!/usr/bin/env node
import { execSync } from "node:child_process";
import fs from "node:fs";

const state = JSON.parse(fs.readFileSync(".lockpack/STATE.json","utf8"));
const allow = state.scope.allow;

function allowed(f) {
  return allow.some(a => {
    if (a.endsWith("/**")) return f.startsWith(a.slice(0,-3));
    return f === a;
  });
}

function sh(cmd){ return execSync(cmd, { encoding: "utf8" }).trim(); }

try {
  const baseRef = process.env.GITHUB_BASE_REF;
  let files = [];

  if (baseRef) {
    sh(`git fetch origin ${baseRef}`);
    const out = sh(`git diff --name-only origin/${baseRef}...HEAD`);
    files = out ? out.split(/\r?\n/).filter(Boolean) : [];
  } else {
    const out = sh("git diff --name-only HEAD^..HEAD");
    files = out ? out.split(/\r?\n/).filter(Boolean) : [];
  }

  const bad = files.filter(f => !allowed(f));
  if (bad.length) {
    console.error("LOCKPACK_SCOPE: violation (outside allowlist): " + bad.join(", "));
    process.exit(1);
  }
  console.log("LOCKPACK_SCOPE: OK");
} catch {
  console.error("LOCKPACK_SCOPE: failed");
  process.exit(1);
}