#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const OUT = "out";
const EVID = path.join(OUT,"evidence");
const LOGS = path.join(OUT,"logs");
fs.mkdirSync(EVID,{recursive:true});
fs.mkdirSync(LOGS,{recursive:true});

function write(p, s){ fs.writeFileSync(p, s, "utf8"); }

const runId = process.env.GITHUB_RUN_ID || "";
const sha   = process.env.GITHUB_SHA || "";
const ref   = process.env.GITHUB_REF || "";
const wf    = process.env.GITHUB_WORKFLOW || "LOCKPACK CI";
const ev    = process.env.GITHUB_EVENT_NAME || "";

write(path.join(EVID,"lockpack.started_at.txt"), new Date().toISOString()+"\n");
write(path.join(EVID,"lockpack.sha.txt"), sha+"\n");

function qg(result, notes, quality){
  return {
    schema: "lockpack.qg.v1",
    run: { provider:"github-actions", workflow:wf, event:ev, ref, sha, run_id:String(runId) },
    quality, result, notes
  };
}

function fail(note){
  const o = qg("FAIL",[note],{ jsErrors: 9999, pending: 9999, abortSafe: false });
  write(path.join(OUT,"QG.json"), JSON.stringify(o,null,2)+"\n");
  process.exit(1);
}

try {
  if (!fs.existsSync(".lockpack/STATE.json")) fail("Missing .lockpack/STATE.json");
  if (!fs.existsSync(".lockpack/HANDOFF.md")) fail("Missing .lockpack/HANDOFF.md");
  if (!fs.existsSync(".github/CODEOWNERS")) fail("Missing .github/CODEOWNERS");

  const metricsPath = ".lockpack/out/runtime.json";
  if (!fs.existsSync(metricsPath)) fail("Missing .lockpack/out/runtime.json (must be produced by npm run lockpack:e2e).");

  let m;
  try { m = JSON.parse(fs.readFileSync(metricsPath,"utf8")); }
  catch { fail("Invalid runtime.json (must be valid JSON)."); }

  const jsErrors  = Number(m.jsErrors);
  const pending   = Number(m.pending);
  const abortSafe = !!m.abortSafe;

  if (!Number.isFinite(jsErrors) || !Number.isFinite(pending)) fail("runtime.json must include numeric jsErrors/pending.");
  if (jsErrors !== 0) fail("jsErrors != 0");
  if (pending !== 0) fail("pending != 0");
  if (!abortSafe) fail("abortSafe != true");

  const o = qg("PASS",["LOCKPACK PASS (runtime.json validated)"],{ jsErrors, pending, abortSafe });
  write(path.join(OUT,"QG.json"), JSON.stringify(o,null,2)+"\n");
  process.exit(0);
} catch (e) {
  fail("LOCKPACK runner exception: " + String(e && e.stack ? e.stack : e));
}