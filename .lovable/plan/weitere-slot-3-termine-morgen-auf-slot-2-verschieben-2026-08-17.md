# Weitere Slot-3-Termine morgen auf Slot 2 verschieben

Stand morgen (Di, 18.08.2026, LIMEX Solutions): Slot 2 hat 11 Termine, Slot 3 hat 12, Slot 4 hat 9.

Vier weitere Termine wandern von Slot 3 auf Slot 2. Die Uhrzeiten bleiben gleich — sie sind auf Slot 2 alle frei (geprüft), es gibt keine Kollision.

```text
Jenny Hagemann     10:10 Slot 3  ->  10:10 Slot 2
Joanna Paris       11:10 Slot 3  ->  11:10 Slot 2
Marc Remstedt      14:00 Slot 3  ->  14:00 Slot 2
Angelina Mulia     14:10 Slot 3  ->  14:10 Slot 2
```

Danach: Slot 2 = 15 Termine, Slot 3 = 8 Termine.

Die späten Termine ab 16:00 (Frey, Altun, Sethoum, Zitzmann) bleiben auf Slot 3, da Slot 2 nur bis 16:00 läuft.

Es werden keine E-Mails und keine SMS verschickt, die Änderung ist rein intern.

## Technische Details

Einmaliges Daten-Update auf `interview_appointments`: `slot_index = 2` für die vier genannten Termin-IDs, `appointment_time` unverändert.
