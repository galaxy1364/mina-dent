import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

function globToRegex(glob){
  const esc = s => s.replace(/[.+^${}()|[\]\\]/g, "\\$&");
  let r = esc(glob).replaceAll("\\*\\*", "###DS###").replaceAll("\\*", "[^/]*").replaceAll("###DS###", ".*");
  return new RegExp("^" + r + "$");
}
function matchesAny(file, globs){ return globs.some(g => globToRegex(g).test(file)); }

const s = JSON.parse(readFileSync(".lockpack/STATE.json","utf8"));

function listChanged(){
  const base = process.env.GITHUB_BASE_REF;
  if(base){
    execSync(`git fetch origin ${base} --depth=1`, { stdio:"inherit" });
    return execSync(`git diff --name-only origin/${base}...HEAD`, { encoding:"utf8" }).split("\n").filter(Boolean);
  }
  return execSync(`git diff --name-only HEAD~1..HEAD`, { encoding:"utf8" }).split("\n").filter(Boolean);
}

const changed = listChanged();
const violations = [];

for(const f of changed){
  if(matchesAny(f, s.forbidden_paths)) violations.push({file:f, reason:"forbidden"});
  else if(!matchesAny(f, s.allowed_paths)) violations.push({file:f, reason:"outside_allowed_paths"});
}

if(violations.length){
  console.error("LOCKPACK_SCOPE FAIL:", JSON.stringify({violations}, null, 2));
  process.exit(1);
}
console.log("LOCKPACK_SCOPE PASS:", changed.length, "files");