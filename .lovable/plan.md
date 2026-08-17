# Restliche Slot-1-Termine bei LIMEX verteilen + Slot 1 schließen

## Warum es wieder Slot-1-Termine gibt (geprüft)

Die 61 Termine vom 16.08. wurden verschoben, aber **Slot 1 ist im Zeitplan weiterhin aktiv** (`disabled = false`, 09:00–17:00, Mo–Fr). Seitdem sind über die Buchungsseite **26 neue Termine** in Slot 1 gelandet (17.08. bis 23.09.). Ohne Abschalten von Slot 1 passiert das immer wieder.

## Was gemacht wird

**1. Slot 1 für neue Buchungen deaktivieren**
Im Zeitplan von LIMEX Solutions wird Slot 1 auf „deaktiviert" gesetzt. Bestehende Termine bleiben sichtbar, neue Buchungen landen nur noch in Slot 2, 3 und 4.

**2. Die 26 verbleibenden Slot-1-Termine verteilen**

Regeln wie beim letzten Mal:
- Uhrzeit +10 Minuten, bei Kollision im Ziel-Slot weitere +10 Minuten.
- Ziel-Slot = der Slot mit der geringsten Auslastung am jeweiligen Tag, der die Uhrzeit abdeckt (Slot 2 und 3 bis 16:00, Slot 4 bis 14:00).
- Termine ab 15:50 gehen auf Slot 3 (flexibel), da Slot 2/4 dort nicht mehr greifen.
- Keine E-Mails, keine SMS an die Bewerber.

Betroffene Termine:

```text
17.08.  15:00  Ricarda Haas
18.08.  09:00  Michael Kokocinski      18.08.  09:20  Jeannine Humpert
18.08.  10:00  Rene Steffen            18.08.  10:20  Gabriela Rose
18.08.  11:00  Joanna Paris            18.08.  11:40  Anna Dorstmüller
18.08.  13:00  Marco Pavlovic          18.08.  14:00  Angelina Mulia
18.08.  15:00  Marco La Bua-Di Bernardo
18.08.  16:20  Ebru Altun              18.08.  16:40  Martin Zitzmann
19.08.  09:00  Pamela Blask            19.08.  09:20  Katharina Weber
19.08.  10:00  Iris Mergard            19.08.  15:40  Alexander Neufeld
19.08.  16:00  Ulli Theilig
20.08.  09:00  Matthias Eltschkner     20.08.  09:20  Doris Waldmann
20.08.  10:00  Jennifer Bandur         20.08.  11:00  Anne Zeugner
21.08.  11:00  Tamara Budwill          21.08.  13:40  Martin Dierks
27.08.  16:40  Gerhard Christian
31.08.  09:00  Jacqueline Corinn Herre
23.09.  15:00  Kerstin Kreibe
```

## Technische Details

- `branding_schedule_settings`: `disabled = true` für `slot_index = 1`, `schedule_type = 'interview'`, Branding LIMEX.
- Daten-Update auf `interview_appointments`: `appointment_time` +10 Min (bzw. mehr bei Kollision) und `slot_index` fest auf 2, 3 oder 4, gefiltert auf die 26 Termin-IDs. Kollisionsprüfung gegen alle bestehenden Termine desselben Tages und Ziel-Slots vor dem Update.
- Keine Codeänderung, keine Benachrichtigungen.
