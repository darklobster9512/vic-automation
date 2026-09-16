# Vendis: Slot-3-Termine auf Slot 1 und 2 verteilen

## Ausgangslage (geprüft)

Bei Vendis Development Services gibt es ab heute (16.09.2026) noch **9 Termine auf Slot 3** — verteilt auf den 16., 17. und 18.09. Slot 1 und 2 laufen jeweils 09:00–17:00 (Mittagspause 12:00–13:00, 20-Minuten-Takt).

## Regeln

1. Termin bleibt auf seiner Uhrzeit, wenn zu dieser Zeit Slot 1 oder Slot 2 frei ist.
2. Sind beide belegt, rutscht der Termin um **10 Minuten** nach hinten und wird dort auf die freie Spur gesetzt.
3. Es werden **keine** E-Mails, SMS oder Telegram-Nachrichten verschickt.
4. Status, Erinnerungs-Zähler und alle übrigen Daten bleiben unverändert.

## Geplante Zuordnung (9 Termine)

| Datum | Name | Alt | Neu |
|---|---|---|---|
| Mi 16.09. | Stefanie Paetzold | 09:00 Slot 3 | 09:10 Slot 1 |
| Mi 16.09. | Heiko Spieker | 10:00 Slot 3 | 10:10 Slot 2 |
| Mi 16.09. | Jasmin Schwab | 11:40 Slot 3 | 11:50 Slot 1 |
| Mi 16.09. | Carina Faßler-Ruf | 13:00 Slot 3 | 13:10 Slot 2 |
| Mi 16.09. | Sate Abbou | 13:20 Slot 3 | 13:30 Slot 1 |
| Mi 16.09. | Sonja Ibert | 14:00 Slot 3 | 14:00 Slot 2 (frei, keine Verschiebung) |
| Do 17.09. | Shatarupa Ganguly | 09:00 Slot 3 | 09:10 Slot 1 |
| Fr 18.09. | Kurt Gruber | 10:00 Slot 3 | 10:10 Slot 2 |
| Fr 18.09. | Celine Heeger | 11:00 Slot 3 | 11:10 Slot 1 |

Alle neuen Zeiten wurden gegen die bestehenden Slot-1- und Slot-2-Termine geprüft: keine Kollision, alles innerhalb der Arbeitszeiten und außerhalb der Mittagspause. Danach ist Slot 3 bei Vendis ab heute leer.

## Technisch

9 gezielte `UPDATE`s auf `interview_appointments` (`slot_index` 1 bzw. 2, ggf. neue `appointment_time`) über die genannten Termin-IDs. Keine Code- oder Schemaänderung, keine Benachrichtigungen.
