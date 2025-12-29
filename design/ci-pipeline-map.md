# CI Pipeline Map — Mina-dent

1) Validate
- lint, typecheck, unit (hard timeouts)

2) Build
- reproducible build
- artifact generated

3) Quality
- e2e (deterministic + timeouts)
- a11y
- perf budgets
- security (deps + static)

4) LOCKPACK
- generate QG.json
- assemble Evidence Pack
- ensure no JS errors, no pending

5) Sign
- sign artifact
- write signed ref into Evidence Pack

6) Deploy (prod)
- only main + prod env protection

7) Post-deploy verify
- smoke + health
- record evidence
