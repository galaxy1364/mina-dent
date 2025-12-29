# Rollback Runbook — Mina-dent

## Triggers
- JS errors > 0
- Any PENDING/timeout breach
- Required check FAIL
- prod protection not satisfied
- Evidence Pack incomplete

## Steps
1) Identify last signed good artifact (previous PASS)
2) Deploy rollback artifact to prod (env rules enforced)
3) Run post-deploy smoke
4) Capture evidence:
   - screenshots + run-metadata
   - updated QG.json for rollback verification

## Acceptance
- Rollback is artifact-based (not ad-hoc rebuild)
- Verification evidence exists
