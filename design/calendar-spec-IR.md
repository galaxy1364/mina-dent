@'

\# Calendar Spec — Iran (fa-IR) for Mina-dent



\## Calendar System

\- Jalali (Shamsi)

\- Week starts on Saturday (SAT)



\## Working Hours

\- Two shifts:

&nbsp; - 08:00–14:00

&nbsp; - 16:00–22:00



\## Weekends / Holidays

\- Thu/Fri policy: configurable (good mode => single shift / official holidays => closed)

\- Official holidays: closed by default

\- "Internal Slot" can override closure (marked as internal)



\## Scheduling Rules

\- Delay is recorded only (no auto-shift)

\- Service durations (minutes):

&nbsp; - Visit 15

&nbsp; - Cleaning 30

&nbsp; - Filling 45

&nbsp; - Root canal 45–90

&nbsp; - Impression 30

&nbsp; - Some services 60–180

&nbsp; - Crown delivery 30–45



\## Formatting

\- Persian digits optional toggle

\- RTL layout required

\- A11y: keyboard + screen reader labels

'@ | Set-Content -Path .\\design\\calendar-spec-IR.md -Encoding utf8



