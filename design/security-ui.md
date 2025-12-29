# Security UI Guidelines — Mina-dent

## Principles
- Least privilege UI: hide/disable actions user can't perform (show reason)
- Sensitive actions require confirmation (no excessive friction)

## PII Safety
- Never show full sensitive identifiers in logs/telemetry
- Mask phone-like identifiers if displayed in logs

## Session & Auth UX
- Clear re-auth prompts
- Map auth failures to actionable UI messages

## Anti-tamper UX cues
- Show "offline/online/last synced"
- Conflict items: "needs review" badge + safe resolution flow

## Acceptance
- No secret exposure in UI
- Security-sensitive flows have confirmations + audit cues
