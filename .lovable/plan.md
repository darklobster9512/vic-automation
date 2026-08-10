# Slot-3-Termine heute Vormittag auf Slot 1 und 2 verteilen

Der Caller von Slot 3 ist krank. Einmalige Datenkorrektur für die fünf Slot-3-Termine heute (10.08.2026) bis 12:00 Uhr bei LIMEX Solutions.

## Was passiert

Jeder Termin wird 10 Minuten nach hinten verschoben und abwechselnd fest auf Slot 1 und Slot 2 gesetzt:

```text
David Vogel        10:20 Slot 3  ->  10:30 Slot 1
Anton Syzov        10:40 Slot 3  ->  10:50 Slot 2
Wolfgang Zingler   11:00 Slot 3  ->  11:10 Slot 1
Michael Schäfer    11:20 Slot 3  ->  11:30 Slot 2
Michael Idler      11:40 Slot 3  ->  11:50 Slot 1
```

Die neuen Uhrzeiten sind geprüft und aktuell komplett frei — es gibt dort keine anderen Termine und keine Blockierungen, also keine Kollision mit Slot 1 oder Slot 2.

Es werden keine E-Mails und keine SMS verschickt, die Änderung ist rein intern. Alle anderen Termine (auch die restlichen Slot-3-Termine ab 13:00 Uhr) bleiben unverändert.

## Technische Details

Einmaliges Daten-Update auf `interview_appointments`: `appointment_time = appointment_time + interval '10 minutes'` und `slot_index` fest auf 1 bzw. 2, gefiltert auf die fünf genannten Termin-IDs. Da `slot_index` manuell gesetzt wird, gewinnt er gegenüber der automatischen Slot-Auflösung und ist damit im Admin-Panel wie im Caller-Panel identisch.
