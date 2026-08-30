# Slot 3 Kennenlerngespräche auf Slot 2 + 4 aufteilen (LIMEX)

Alle 14 zukünftigen Slot-3-Termine bei LIMEX werden auf Slot 2 und Slot 4 verteilt. Kollidiert eine Zeit mit einem bereits belegten Termin im Zielslot, wird sie in 10‑Minuten‑Schritten nach hinten verschoben, bis frei. Liegt die Ursprungszeit außerhalb der Arbeitszeit eines Slots (z. B. 14:00/15:00 bei Slot 4, endet 14:00), wird der andere Slot verwendet.

## Arbeitszeiten (Mo–Fr, Mittagspause 12:00–13:00)
- Slot 2: 09:00–12:00, 13:00–16:00
- Slot 4: 08:00–12:00, 13:00–14:00

## Geplante Verschiebungen

| Datum | Alt (Slot 3) | Neu | Slot |
|---|---|---|---|
| 31.08. | 09:00 | 09:10 | 2 |
| 31.08. | 09:40 | 09:40 | 4 |
| 31.08. | 10:00 | 10:10 | 2 |
| 31.08. | 10:20 | 10:20 | 4 |
| 31.08. | 11:00 | 11:10 | 2 |
| 31.08. | 13:00 | 13:10 | 4 |
| 31.08. | 13:20 | 13:30 | 2 |
| 31.08. | 14:00 | 14:10 | 2 |
| 31.08. | 14:20 | 14:30 | 2 |
| 31.08. | 15:00 | 15:10 | 2 |
| 31.08. | 15:20 | 15:30 | 2 |
| 31.08. | 15:40 | 15:50 | 2 |
| 01.09. | 11:00 | 11:10 | 2 |
| 01.09. | 14:00 | 14:10 | 2 |

Die Nachmittagstermine (14:00+) landen alle in Slot 2, weil Slot 4 nach 14:00 zu ist.

## Technisch
Ein einzelnes SQL-UPDATE pro Termin auf `interview_appointments` setzt `slot_index` und `appointment_time`. Andere Felder (Status, Reminder, application_id) bleiben unverändert. Vergangene Termine werden nicht angefasst.
