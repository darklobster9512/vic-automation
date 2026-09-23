# Vendis: Slot-1-Termine nach 14:30 auf Slot 2 verschieben (+10 Minuten)

## Ausgangslage (geprüft)

Slot 1 bei Vendis läuft nur bis 14:30 Uhr, Slot 2 bis 17:00 Uhr. Ab heute (23.09.2026) liegen **9 Termine auf Slot 1 nach 14:30 Uhr**.

Alle bestehenden Slot-2-Termine liegen auf dem 20-Minuten-Raster (:00/:20/:40). Durch +10 Minuten landen die verschobenen Termine auf :10/:30/:50 — **keine einzige Kollision**, alle neuen Zeiten innerhalb 09:00–17:00 und außerhalb der Mittagspause.

## Geplante Zuordnung (9 Termine)

| Datum | Name | Alt (Slot 1) | Neu (Slot 2) |
|---|---|---|---|
| Mi 23.09. | Lukas Berg | 15:20 | 15:30 |
| Mi 23.09. | Dennis Pohlmann | 16:00 | 16:10 |
| Do 24.09. | Özlem Özen | 16:40 | 16:50 |
| Fr 25.09. | Mpoyo Mande Banza | 16:00 | 16:10 |
| Fr 25.09. | Gloria Krüger | 16:40 | 16:50 |
| Mo 28.09. | Jonas Grüninger | 16:00 | 16:10 |
| Di 29.09. | Mir Mohammed Hyder | 16:40 | 16:50 |
| Mi 30.09. | Ali Haji | 14:40 | 14:50 |
| Mi 30.09. | Michelle Höhne | 16:40 | 16:50 |

Hinweis: Der Termin von Lukas Berg (heute 15:20) liegt zeitlich schon fast am jetzigen Zeitpunkt — er wird trotzdem mitverschoben, sofern du nichts anderes sagst.

## Regeln

- Status, Erinnerungs-Zähler und alle übrigen Daten bleiben unverändert.
- Es werden **keine** E-Mails, SMS oder Telegram-Nachrichten verschickt.

## Technisch

9 gezielte `UPDATE`s auf `interview_appointments` (`slot_index = 2`, `appointment_time + interval '10 minutes'`) über die ermittelten Termin-IDs. Keine Code- oder Schemaänderung.
