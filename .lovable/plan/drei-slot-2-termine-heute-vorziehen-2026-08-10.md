# Drei Slot-2-Termine heute vorziehen

Einmalige Datenkorrektur für drei Slot-2-Termine heute (10.08.2026) bei LIMEX Solutions.

```text
Jose Nhambe      16:50 Slot 2  ->  15:50 Slot 2
Habil Uz         16:30 Slot 2  ->  15:30 Slot 2
Richard Babai    16:10 Slot 2  ->  16:00 Slot 2
```

Die neuen Uhrzeiten wurden geprüft: 15:30, 15:50 und 16:00 sind auf Slot 2 heute frei — keine Kollision mit bestehenden Terminen.

Es werden keine E-Mails und keine SMS verschickt, die Änderung ist rein intern.

## Technische Details

Einmaliges Daten-Update auf `interview_appointments`: `appointment_time` auf die neuen Zeiten setzen, `slot_index` bleibt 2, gefiltert auf die drei Termin-IDs.
