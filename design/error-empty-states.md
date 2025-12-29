# Error & Empty States — Mina-dent

## Taxonomy
- network_offline
- network_timeout
- auth_required
- permission_denied
- validation_error
- conflict_detected
- storage_corrupt
- unknown_error

## Rules
- No dead ends: every error/empty state must offer a next action:
  - Retry (abortable)
  - Edit inputs
  - Go back
- Persian copy: short, actionable, non-technical

## Empty States
- Explain what this is + clear CTA

## Retries
- Idempotent
- AbortController-bound
- Stop after max attempts and show next step

## Acceptance
- Zero blank screens
- No infinite loading
