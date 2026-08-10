# Restliche Slot-3-Termine heute (ab 12 Uhr) auf Slot 2 verschieben

Einmalige Datenkorrektur für die acht verbleibenden Slot-3-Termine heute (10.08.2026) ab 12:00 Uhr bei LIMEX Solutions. Jeder Termin rutscht 10 Minuten nach hinten und wird fest auf Slot 2 gesetzt.

```text
Leonie Sophie Hart   13:00 Slot 3  ->  13:10 Slot 2
Stefanie Netzel      13:20 Slot 3  ->  13:30 Slot 2
Claudia Wittmann     13:40 Slot 3  ->  13:50 Slot 2
Renate Lindel        14:00 Slot 3  ->  14:10 Slot 2
Slaven Gudelj        15:00 Slot 3  ->  15:10 Slot 2
Richard Babai        16:00 Slot 3  ->  16:10 Slot 2
Habil Uz             16:20 Slot 3  ->  16:30 Slot 2
Jose Nhambe          16:40 Slot 3  ->  16:50 Slot 2
```

Alle neuen Uhrzeiten wurden geprüft und sind heute komplett frei — keine anderen Termine, also keine Kollision mit Slot 1 oder Slot 2.

Es werden keine E-Mails und keine SMS verschickt, die Änderung ist rein intern.

## Technische Details

Einmaliges Daten-Update auf `interview_appointments`: `appointment_time = appointment_time + interval '10 minutes'`, `slot_index = 2`, gefiltert auf die acht genannten Termin-IDs. Der manuell gesetzte `slot_index` gewinnt gegenüber der automatischen Slot-Auflösung, damit Admin- und Caller-Panel identisch anzeigen.
