# Accessibility + RTL + i18n (fa-IR) — Mina-dent

## Standards
- WCAG 2.2 AA baseline
- RTL-first (fa-IR), LTR fallback

## Interaction
- Touch targets >= 44px (iOS)
- Focus visible (keyboard users)
- If modal/sheet: trap focus only while open and restore on close

## Screen Readers
- Every actionable icon has aria-label (Persian)
- Sheets/Modals:
  - role="dialog"
  - aria-modal="true"
  - aria-labelledby points to visible title
- Live regions for toasts (polite)

## Reduce Motion
- Respect system reduce-motion
- Replace spring-heavy transitions with fade/instant within 120ms

## Color & Contrast
- Minimum contrast 4.5:1 for body text; 3:1 for large text/icons
- Don’t rely on color-only meaning; add icon/label

## RTL Rules
- Layout mirrors (leading/trailing)
- Numerals: optional Persian digits toggle
- Dates: Jalali formatting

## Acceptance
- Keyboard navigation end-to-end
- No critical a11y violations in automated scan
