# Quality Policy (Global Standard)

This repository is governed by a single, reproducible Quality Gate (LOCKPACK).

## Definition of PASS
PASS means:
- install: `npm ci` succeeds from a clean state
- lint/typecheck/test/build/e2e/security all PASS
- no infinite pending: every step has a hard timeout
- abort-safe: on SIGINT/SIGTERM, child processes are terminated
- evidence emitted: artifacts/QG.json + artifacts/manifest.json updated

## Execution
The only supported command for verification is:
- `npm run -s lockpack:verify`

No manual “it works on my machine” checks replace the gate.
