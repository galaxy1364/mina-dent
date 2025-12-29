PIN\_SHA256=<HASH> PIN\_COMMIT=<SHA> LOCKPACK CONTINUITY — SINGLE SOURCE OF TRUTH
AI\_SIGNATURE: PYM JBZ

Repo: galaxy1364/mina-dent
Branch: fix/lockpack-scripts
PR: https://github.com/galaxy1364/mina-dent/pull/63
Checks: https://github.com/galaxy1364/mina-dent/pull/63/checks

Known evidence ZIPs (local):

* evidence (7).zip
* prod\_deploy\_evidence (3).zip

Known sha256:

* ce0c66959a5f18c329971f99cd8cca7c3adebb2c80d88fa7424d6e130f788733
* ee22625ec5d172cc84ad8b7b1856055e24b6374257660a7bb39d1d3324efd094

Status:

* Ruleset LOCKPACK-main ACTIVE
* Required checks: build, lockpack
* Prod env approval gate enabled

Next: Fix-to-PASS items:

1. CODEOWNERS proof via PR edit (do not recreate)
2. Commit HashLock manifest + CI verify step
3. Ensure evidence artifacts uploaded from CI
