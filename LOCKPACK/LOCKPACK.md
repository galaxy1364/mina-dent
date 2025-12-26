# LOCKPACK Contract (Repo-level)

## Required Checks (Ruleset)
- LOCKPACK CI / build
- LOCKPACK CI / lockpack
- (prod) LOCKPACK CI / deploy_prod

## Evidence Layout (Artifact: evidence)
- evidence/QG.json
- LOCKPACK/HASHLOCK.sha256
- snapshot/
- evidence.tgz
- evidence.tgz.sig
- evidence.tgz.crt

## PASS Definition
- Zero JS runtime errors (console.error / pageerror / unhandledrejection) via CI smoke
- No infinite pending (timeouts in CI)
- Abort-safe (fail fast)
- Signed CI artifact (cosign OIDC keyless)
- Evidence complete (QG.json + snapshot + manifest/hash)
