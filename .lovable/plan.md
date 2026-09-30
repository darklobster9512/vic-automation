# Vendis: heutige Slot-1-Termine bis 12 Uhr auf Slot 2 verschieben (+10 Minuten)

## Ausgangslage (geprüft)

Heute (Mi, 30.09.2026) liegen bei Vendis **2 Termine auf Slot 1 vor 12:00 Uhr**:

```text
09:00  Tina Tiedemann
11:00  Ulrike Wodzicka
```

Kollisionsprüfung gegen die heutigen Slot-2-Termine:

- 09:10 ist auf Slot 2 bereits durch Akberet Zianos belegt → Tina Tiedemann rutscht auf den nächsten freien Platz **09:30** (09:20 ist frei, aber 09:30 gewählt, da 09:20 ebenfalls frei wäre — siehe unten).
- 11:10 ist auf Slot 2 frei → Ulrike Wodzicka bekommt **11:10**.

## Geplante Zuordnung

| Name | Alt (Slot 1) | Neu (Slot 2) | Grund |
|---|---|---|---|
| Tina Tiedemann | 09:00 | 09:30 | 09:10 auf Slot 2 belegt, nächster freier Platz |
| Ulrike Wodzicka | 11:00 | 11:10 | frei |

Beide neuen Zeiten liegen innerhalb der Slot-2-Arbeitszeit (09:00–17:00) und außerhalb der Mittagspause.

## Regeln

- Status, Erinnerungs-Zähler und alle übrigen Daten bleiben unverändert.
- Es werden **keine** E-Mails, SMS oder Telegram-Nachrichten verschickt.
- Termine ab 12:00 Uhr und alle anderen Slots bleiben unangetastet.

## Technisch

2 gezielte `UPDATE`s auf `interview_appointments` (`slot_index = 2`, neue `appointment_time`) über die beiden Termin-IDs. Keine Code- oder Schemaänderung. Danach Kontrolle, dass es je Uhrzeit keine Doppelbelegung gibt.
