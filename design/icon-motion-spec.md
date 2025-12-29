@'

\# Icon + Motion Spec (32px, 3D, multicolor, borderless)



\## Visual

\- Size: 32px grid

\- No frame/border

\- Multicolor + soft 3D shading

\- Consistent light source, soft shadow



\## Motion Principles

\- Must be semantic (meaningful)

\- No random wobble

\- Micro-interactions only (fast, calm)



\## States

\- Idle: subtle alive (≤ 1.5% movement)

\- Press: spring.press + squash/stretch minimal

\- Success: pop + sparkle (brief)

\- Error: shake is forbidden; use semantic "deny" animation (e.g., cross draw)



\## Export

\- Preferred: SVG + CSS animations

\- Optional: Lottie for complex scenes (perf budget enforced)

'@ | Set-Content -Path .\\design\\icon-motion-spec.md -Encoding utf8



