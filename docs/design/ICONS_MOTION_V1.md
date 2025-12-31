# ICONS + MOTION (iOS26+) — MinaDent (v1)

## Non-negotiables
- Icon size: 32px (export 1x/2x/3x). No frame/border. Multi-color, vivid, slightly 3D.
- Motion must be semantic (not shake/bounce only). Duration 160–320ms, easing: standard iOS-like.
- Reduced Motion: must have non-animated fallback (prefers-reduced-motion).
- A11y: focus/hover states + aria-label + minimum hit-area 44px.

## Micro-interaction contract
- Tap: scale 0.98 -> 1.00 (120–160ms) + soft highlight
- Success: checkmark draw (200–260ms)
- Loading: finite (timeout) + abort-safe; no infinite spinner

## Allowed motion types
- Stroke-draw, subtle parallax, soft squash/stretch (<=3%), shimmer (short), count-up (short)

## Forbidden
- Infinite loops without timeout
- Motion that blocks scroll/tap
- Console errors / unhandledrejection

## Evidence requirements
- Record 10s screen capture of 3 interactions (tap, success, loading-abort)
- Snapshot: include mp4/png + notes
