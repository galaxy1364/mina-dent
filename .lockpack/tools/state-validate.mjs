#!/usr/bin/env node
import fs from "node:fs";

const p = ".lockpack/STATE.json";
if (!fs.existsSync(p)) { console.error("LOCKPACK_STATE: missing .lockpack/STATE.json"); process.exit(1); }

let s;
try { s = JSON.parse(fs.readFileSync(p,"utf8")); }
catch { console.error("LOCKPACK_STATE: invalid JSON"); process.exit(1); }

function req(k, t) {
  if (!(k in s)) { console.error(`LOCKPACK_STATE: missing ${k}`); process.exit(1); }
  if (t === "array" && !Array.isArray(s[k])) { console.error(`LOCKPACK_STATE: ${k} must be array`); process.exit(1); }
  if (t !== "array" && typeof s[k] !== t) { console.error(`LOCKPACK_STATE: ${k} must be ${t}`); process.exit(1); }
}
req("schema","string");
req("canonical","boolean");
req("phase","string");
req("required","object");
req("required_gates","array");
req("scope","object");

if (s.schema !== "lockpack.state.v1") { console.error("LOCKPACK_STATE: bad schema"); process.exit(1); }
if (s.phase !== "LOCKED") { console.error("LOCKPACK_STATE: phase must be LOCKED"); process.exit(1); }

const mustReq = ["orgRuleset","requiredGates","codeowners","hashlock","evidence","protectedProd"];
for (const k of mustReq) {
  if (!s.required || s.required[k] !== true) { console.error("LOCKPACK_STATE: required."+k+" must be true"); process.exit(1); }
}

const mustGates = [
  "LOCKPACK_STATE","LOCKPACK_SCOPE","LOCKPACK_JS0","LOCKPACK_NOPENDING","LOCKPACK_ABORTSAFE",
  "LOCKPACK_SIGNED_ARTIFACT","LOCKPACK_HASHLOCK","LOCKPACK_EVIDENCE"
];
for (const g of mustGates) {
  if (!s.required_gates.includes(g)) { console.error("LOCKPACK_STATE: missing required_gates: "+g); process.exit(1); }
}

if (!s.scope.allow || !Array.isArray(s.scope.allow) || s.scope.allow.length === 0) {
  console.error("LOCKPACK_SCOPE: scope.allow missing/empty");
  process.exit(1);
}

console.log("LOCKPACK_STATE: OK");