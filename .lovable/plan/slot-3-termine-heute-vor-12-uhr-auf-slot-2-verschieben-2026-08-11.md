# Slot-3-Termine heute vor 12 Uhr auf Slot 2 verschieben

Einmalige Datenkorrektur für die sechs Slot-3-Termine heute (11.08.2026) vor 12:00 Uhr bei LIMEX Solutions. Jeder Termin rutscht 10 Minuten nach hinten und wird fest auf Slot 2 gesetzt.

```text
Sascha Thees        09:20 Slot 3  ->  09:30 Slot 2
Verena Fasch        10:00 Slot 3  ->  10:10 Slot 2
David Vogel         10:20 Slot 3  ->  10:30 Slot 2
Sebastian Pochert   10:40 Slot 3  ->  10:50 Slot 2
Heike Kepper        11:00 Slot 3  ->  11:10 Slot 2
Annette Marquardt   11:40 Slot 3  ->  11:50 Slot 2
```

Alle Zieluhrzeiten wurden geprüft und sind heute frei — keine Kollision mit Slot 1 oder Slot 2.

Es werden keine E-Mails und keine SMS verschickt, die Änderung ist rein intern. Alle anderen Termine bleiben unverändert.

## Technische Details

Einmaliges Daten-Update auf `interview_appointments`: `appointment_time = appointment_time + interval '10 minutes'`, `slot_index = 2`, gefiltert auf die sechs genannten Termin-IDs. Der manuell gesetzte `slot_index` gewinnt gegenüber der automatischen Slot-Auflösung, damit Admin- und Caller-Panel identisch anzeigen.
