# Dashboard Spec v2 (iOS26+)

## Layout
- Top: greeting + clinic status chip
- Cards row: Today Appointments / Revenue / Pending Lab
- Primary CTA: "New Appointment" (safe-area aware)
- List: Next 6 appointments with unit color badges

## States
- Loading: skeleton cards
- Empty: friendly empty state + CTA
- Error: retry button + log-safe message

## A11y
- Tab order defined, aria labels, 44px taps
