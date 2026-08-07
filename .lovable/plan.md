# Termin von Salvatore Prestifilippo verschieben

## Ausgangslage (geprüft)

```text
Salvatore Prestifilippo
aktuell: Fr, 07.08.2026 — 16:40 Uhr, Slot 1
Ziel:    Fr, 07.08.2026 — 15:40 Uhr, Slot 2
```

Um 15:40 Uhr liegt an diesem Tag bei LIMEX Solutions aktuell kein Termin, Slot 2 ist frei.

## Was passiert

- Der Termin wird auf 15:40 Uhr gelegt und fest auf Slot 2 gesetzt.
- Es werden keine E-Mails und keine SMS ausgelöst.

## Technische Details

- `UPDATE public.interview_appointments SET appointment_time = '15:40', slot_index = 2 WHERE id = '4f3a4d28-f312-404c-a84a-d466b74d7658'`
