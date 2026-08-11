# Slot-1-Termine ab 12:50 heute auf Slot 3 verschieben

Einmalige Datenkorrektur für die vier Slot-1-Termine heute (11.08.2026) ab 12:50 Uhr bei LIMEX Solutions. Jeder Termin rutscht 5 Minuten nach hinten und wird fest auf Slot 3 gesetzt.

```text
Anke Wagner           13:00 Slot 1  ->  13:05 Slot 3
Frank Bruder          14:00 Slot 1  ->  14:05 Slot 3
Josefine Kannamüller  15:00 Slot 1  ->  15:05 Slot 3
Nadine Schmidt        16:40 Slot 1  ->  16:45 Slot 3
```

Alle Zieluhrzeiten wurden geprüft und sind auf Slot 3 heute frei — keine Kollision mit bestehenden Terminen (Slot 3 belegt aktuell 13:00, 14:20, 15:00, 16:40).

Es werden keine E-Mails und keine SMS verschickt, die Änderung ist rein intern. Alle anderen Termine bleiben unverändert.

## Technische Details

Einmaliges Daten-Update auf `interview_appointments`: `appointment_time = appointment_time + interval '5 minutes'`, `slot_index = 3`, gefiltert auf die vier genannten Termin-IDs. Der manuell gesetzte `slot_index` gewinnt gegenüber der automatischen Slot-Auflösung, damit Admin- und Caller-Panel identisch anzeigen.
