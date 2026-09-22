# Vendis: alle Slot-3-Termine auf Slot 1 und 2 verschieben (+10 Minuten)

## Ausgangslage (geprüft)

Bei Vendis Development Services liegen ab heute (22.09.2026) noch **14 Termine auf Slot 3**, verteilt auf den 22.09., 23.09., 28.09. und 30.09. Slot 1 und Slot 2 laufen jeweils 09:00–17:00 (Mittagspause 12:00–13:00, 20-Minuten-Takt).

Alle bestehenden Termine in Slot 1 und 2 liegen auf dem 20-Minuten-Raster (:00/:20/:40). Durch die Verschiebung um +10 Minuten landen die verschobenen Termine auf :10/:30/:50 — es gibt daher **keine einzige Kollision**. Alle neuen Zeiten liegen innerhalb der Arbeitszeit und außerhalb der Mittagspause.

## Regeln

1. Uhrzeit **+10 Minuten**, Slot abwechselnd **1 / 2** (gleichmäßige Verteilung).
2. Status, Erinnerungs-Zähler und alle übrigen Daten bleiben unverändert.
3. Es werden **keine** E-Mails, SMS oder Telegram-Nachrichten verschickt.

## Geplante Zuordnung (14 Termine)

| Datum | Name | Alt (Slot 3) | Neu |
|---|---|---|---|
| Di 22.09. | ONYINYECHI Gold Sunday | 09:00 | 09:10 Slot 1 |
| Di 22.09. | Francie Fritsche | 09:40 | 09:50 Slot 2 |
| Di 22.09. | Anja Todt | 10:00 | 10:10 Slot 1 |
| Di 22.09. | Wolfgang Zingler | 11:00 | 11:10 Slot 2 |
| Di 22.09. | Marc Reckinger | 11:20 | 11:30 Slot 1 |
| Di 22.09. | Martina Gottswinter | 11:40 | 11:50 Slot 2 |
| Di 22.09. | Franziska Risse | 13:00 | 13:10 Slot 1 |
| Di 22.09. | Omar Eugenio Mejia Chavez | 14:00 | 14:10 Slot 2 |
| Di 22.09. | Farbod Parvin | 15:00 | 15:10 Slot 1 |
| Mi 23.09. | Mohamed Eter | 10:00 | 10:10 Slot 2 |
| Mi 23.09. | Edith Stallmann | 11:40 | 11:50 Slot 1 |
| Mi 23.09. | Simon Fauth | 14:00 | 14:10 Slot 2 |
| Mo 28.09. | Dania Hoffmann | 09:00 | 09:10 Slot 1 |
| Mi 30.09. | Akberet Zianos | 09:00 | 09:10 Slot 2 |

Danach ist Slot 3 bei Vendis ab heute leer.

## Technisch

14 gezielte `UPDATE`s auf `interview_appointments` (`slot_index` 1 bzw. 2, `appointment_time` +10 Minuten) über die genannten Termin-IDs. Keine Code- oder Schemaänderung, keine Benachrichtigungen.
