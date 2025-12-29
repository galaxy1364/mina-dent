# Performance Budgets — Mina-dent (PWA/iOS Safari-forward)

## Core Budgets
- Long task threshold: <= 50ms
- Frame drops: max 2 consecutive drops on critical transitions
- Sheet open/close settle: <= 300ms (hard budget)
- JS error budget: 0 (unhandledrejection/onerror/console.error)

## Rendering
- Avoid layout thrash on open/close
- Prefer transform/opacity animations
- Defer non-critical work until idle

## Network / Offline
- Offline-first: critical flows must function offline
- Retry: exponential backoff with jitter; all retries abortable

## Memory / Leaks
- Listener audit: no orphan listeners after close/unmount
- AbortController cleanup mandatory for all async

## Acceptance
- Meets budgets on mid-tier devices
- No jank spikes during sheet transitions
