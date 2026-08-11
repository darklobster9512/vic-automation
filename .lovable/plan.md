# Termin morgen 11:00 Uhr auf Slot 2 / 11:10 verschieben

## Ausgangslage (geprüft)

Morgen (Mi, 12.08.2026) liegen bei LIMEX um 11:00 Uhr vier Termine:

```text
11:00  Slot 2  Daniel Stranz
11:00  Slot 3  michael rossoll
11:00  Slot 4  Rene Steffen
11:00  (ohne festen Slot)  Kerem Ay  -> wird automatisch als Slot 1 angezeigt
```

Der gesuchte Slot-1-Termin ist also **Kerem Ay**. Um 11:10 Uhr gibt es an diesem Tag keinen Termin, Slot 2 ist dort frei.

## Was passiert

- Kerem Ay wird auf 11:10 Uhr gelegt und fest auf Slot 2 gesetzt.
- Keine E-Mails und keine SMS.

## Technische Details

- `UPDATE public.interview_appointments SET appointment_time = '11:10', slot_index = 2 WHERE id = '45227fa0-46d5-4def-a0b4-b020d5797fa6'`
