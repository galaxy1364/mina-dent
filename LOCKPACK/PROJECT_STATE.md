# PROJECT STATE — mina-dent
# ⚠️ SOURCE OF TRUTH — DO NOT GUESS

## OVERALL STATUS
- Project: mina-dent
- Phase: CI Stabilization + Lockpack Enforcement
- Status: PROCEED (Memory Locked)
- Last Reviewed: 2025-12-28
- Active Branch: work-sync

---

## WHAT IS CONFIRMED DONE (EVIDENCE-BASED)

### Code & Runtime
- TypeScript pinned to 5.5.4
- ESLint violations fixed (local lint PASS)
- AuthController typed safely (no any)
- Smoke test hardened (Abort-safe, timeout-safe)

### CI / Automation
- GitHub Actions pipeline exists (build → lockpack → deploy_prod)
- Lint aligned to root ESLint config
- Workspace ESLint issue identified
- Smoke test NPM_CLI_NOT_FOUND fixed

### Lockpack
- lockpack:refresh local PASS
- signed_ci_artifact = FALSE (waiting for CI green)

---

## WHAT IS NOT DONE (BLOCKERS)

- CI build job FAILING
- signed_ci_artifact = false
- Attestation evidence missing
- deploy_prod intentionally blocked

---

## CURRENT BLOCKING ERROR
- CI fails during Lint step
- Resolution chosen: run lint from repo root

---

## EXACT NEXT STEP (NO ALTERNATIVES)

1. Re-run GitHub Actions on branch work-sync
2. Observe build job
3. If FAIL → copy exact failing step log
4. If PASS → collect attestation → update QG.json

---

## DO NOT TOUCH (LOCKED)
- scripts/ci-smoke.mjs
- lockpack-refresh.mjs
- ESLint rules
- TypeScript version
