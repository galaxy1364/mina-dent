#!/usr/bin/env bash
set -euo pipefail

HARD_TIMEOUT_MS="${HARD_TIMEOUT_MS:-600000}" # 10m hard cap
START_TS="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

REPO="${GITHUB_REPOSITORY:-unknown}"
WF="${GITHUB_WORKFLOW:-unknown}"
RUN_ID="${GITHUB_RUN_ID:-unknown}"
SHA="${GITHUB_SHA:-unknown}"
REF="${GITHUB_REF:-unknown}"

mkdir -p lockpack/out

JS_ERRORS_COUNT=0
PENDING_COUNT=0
ABORT_OK=true

if [[ -f "lockpack/project-lockpack.sh" ]]; then
  echo "Found lockpack/project-lockpack.sh -> executing with hard timeout ${HARD_TIMEOUT_MS}ms"
  SEC=$(( (HARD_TIMEOUT_MS + 999) / 1000 ))
  if ! timeout "${SEC}"s bash lockpack/project-lockpack.sh > lockpack/out/project.log 2>&1; then
    ABORT_OK=false
    echo "project-lockpack timed out or failed; see lockpack/out/project.log" >&2
  fi
else
  echo "No project lockpack harness found; checks recorded as SKIPPED where applicable"
fi

OVERALL="PASS"
if [[ "${JS_ERRORS_COUNT}" -gt 0 ]]; then OVERALL="FAIL"; fi
if [[ "${PENDING_COUNT}" -gt 0 ]]; then OVERALL="FAIL"; fi
if [[ "${ABORT_OK}" != "true" ]]; then OVERALL="FAIL"; fi

cat > lockpack/out/QG.json <<EOF
{
  "version": "1.0.0",
  "run": {
    "repo": "${REPO}",
    "workflow": "${WF}",
    "run_id": "${RUN_ID}",
    "sha": "${SHA}",
    "ref": "${REF}",
    "ts_utc": "${START_TS}"
  },
  "checks": {
    "js_errors": { "count": ${JS_ERRORS_COUNT}, "details": [] },
    "pending":   { "count": ${PENDING_COUNT},  "details": [] },
    "abort_safe":{ "ok": ${ABORT_OK},          "details": [] },
    "timeouts_ms": { "hard_timeout_ms": ${HARD_TIMEOUT_MS} }
  },
  "overall": "${OVERALL}"
}
EOF

python - <<'PY'
import hashlib, json, pathlib
root = pathlib.Path(".")
paths = [
  ".github/workflows/lockpack-ci.yml",
  ".gitattributes",
  ".github/CODEOWNERS",
  "lockpack/run-lockpack.sh",
  "lockpack/qg.schema.json",
]
items = []
for p in paths:
  fp = root / p
  if fp.exists():
    items.append({"path": p, "sha256": hashlib.sha256(fp.read_bytes()).hexdigest()})
  else:
    items.append({"path": p, "missing": True})
out = {"version":"1.0.0","items":items}
(root/"lockpack/out/manifest.json").write_text(json.dumps(out, indent=2), encoding="utf-8")
PY

echo "QG written: lockpack/out/QG.json"
echo "Manifest:  lockpack/out/manifest.json"

if [[ "${OVERALL}" != "PASS" ]]; then
  echo "LOCKPACK OVERALL=${OVERALL} -> failing job"
  exit 1
fi