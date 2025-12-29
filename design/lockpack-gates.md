# LOCKPACK Gates — Mina-dent

## Required Checks (CI)
- build
- lockpack
- lint
- typecheck
- unit
- e2e
- a11y
- perf
- security
- sbom_provenance
- artifact_sign

## PASS Definition (Hard)
- Zero JS runtime errors:
  - window.onerror = 0
  - unhandledrejection = 0
  - console.error = 0
- No infinite pending: every test has hard timeout
- Abort-safe: ABORTED is a valid terminal outcome
- Signed CI artifact exists and is referenced
- Evidence Pack is complete:
  - QG.json + manifest + screenshots (optional video)

## Go / No-Go
- Missing any lock => STOP
- FAIL => FIX-to-PASS or ROLLBACK (no bypass)
