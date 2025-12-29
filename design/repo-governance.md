# Repo Governance — Mina-dent

## Branch Protection (main)
- PR required
- approvals >= 2
- CODEOWNERS review required
- Required checks: all LOCKPACK gates
- No bypass (even admin)

## Environments
- prod environment protected
- prevent self-review: ON
- deploy only from main

## Drift Lock
- Hash important configs (workflows / required checks list / env rules as documented)
- Any drift => STOP release until reconciled
