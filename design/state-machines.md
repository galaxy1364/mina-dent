# Mina-dent UI State Machines (HARD MODE)

## Scope
Applies to: Sheet, Modal, Drawer, Popover

## Canonical States
- idle
- opening
- open
- closing
- aborted
- error

## Canonical Events
- OPEN(requestId)
- OPENED(requestId)
- CLOSE(requestId)
- CLOSED(requestId)
- ABORT(requestId, reason)
- ERROR(requestId, errorCode)

## Hard Invariants (MUST)
1) OPEN => Backdrop=ON AND Panel=VISIBLE AND ScrollLock=ON
2) CLOSE => Backdrop=OFF AND Panel=HIDDEN AND ScrollLock=OFF
3) Backdrop WITHOUT Panel is FORBIDDEN (orphan-backdrop)
4) ScrollLock WITHOUT Open panel is FORBIDDEN (orphan-scrolllock)
5) Every async effect MUST be AbortController-bound (abort on CLOSE, ABORT, unmount)

## Timeouts (No infinite pending)
- opening: hard timeout (default 900ms)
- closing: hard timeout (default 900ms)
Timeout => ABORTED + full cleanup + telemetry

## Contract Signals (for tests)
Emit exactly once per transition:
- emit("ui:sheet:opened", {requestId, ttOpenMs})
- emit("ui:sheet:closed", {requestId, ttCloseMs})
- emit("ui:sheet:settled", {requestId, state})

## Acceptance
- No PENDING forever
- ABORTED is a valid terminal outcome
- Invariants always restored on terminal states (idle/aborted/error)
