@'

\# Mina-dent Components Contract (Design)



\## Global Rules

\- RTL-first (fa-IR), LTR fallback.

\- Touch target ≥ 44px.

\- Reduce Motion respected.

\- Zero dead buttons, zero blank screens.



\## Sheet/Modal (HARD MODE)

\### State Machine

States: idle → opening → open → closing → aborted → error  

Events: OPEN, OPENED, CLOSE, CLOSED, ABORT, ERROR



\### Invariants (MUST)

\- OPEN ⇒ Backdrop=ON AND ScrollLock=ON

\- CLOSE ⇒ Backdrop=OFF AND ScrollLock=OFF

\- Backdrop WITHOUT Panel is forbidden

\- Every async must be AbortController-bound



\### Timeouts

\- opening/closing: hard timeout (no infinite pending)

\- timeout ⇒ ABORTED + cleanup invariants



\## Buttons

\- Press animation: spring.press

\- Disabled: no pointer events + clear state

\- Loading: spinner + idempotent action



\## Lists

\- Insert/remove: stagger tokens

\- Empty state always includes CTA



\## Forms

\- Validation before submit

\- Error message in Persian, actionable

'@ | Set-Content -Path .\\design\\components.md -Encoding utf8



