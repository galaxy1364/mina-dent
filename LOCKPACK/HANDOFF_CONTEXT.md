# LOCKPACK/HANDOFF_CONTEXT.md  (LOCKPACK handoff - paste into new chat)
# Purpose: continue from current state WITHOUT extra questions.

PROJECT: mina-dent
REPO: galaxy1364/mina-dent
BRANCH_NOW: lockpack/proof-prod-protected-20251230-180302

# Current Known Autopilots
- LOCKPACK/LOCKPACK_AUTOPILOT.ps1 (evidence tree standardizer + NEXT_STEP.txt)
- LOCKPACK/DEPLOYPRO2_AUTOPILOT.ps1 (verify pinned DeployPro2 pack)
- LOCKPACK/DEPLOYPRO2_RUN_AUTOPILOT.ps1 (dispatch+select run-after-dispatch + pull artifacts + build evidence zip + pin)

# Pins (do not guess; read these files)
- LOCKPACK/LATEST.txt
- LOCKPACK/LATEST_DEPLOYPRO2.txt

# Critical constraints (LOCKPACK)
- No bypass. Default STOP unless PASS proven with Evidence Pack.
- PASS requires: Zero JS Errors + No Pending + Abort-safe + Signed CI artifact + Evidence pack (QG.json + snapshot + hashes + receipt) + Protected prod + required gates + CODEOWNERS + HashLock.
- Only paths: Proceed / Fix-to-PASS / Rollback. Scope freeze until phase PASS.

# Immediate objective
1) Create a "Handoff Block" printer that outputs: repo, head, branch, pins, latest evidence paths (zip/dir/qg), and next actions.
2) Ensure it is deterministic, no network, no prompts.

AI_SIGNATURE: PYM JBZ
