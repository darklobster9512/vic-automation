# Zukünftige LIMEX Slot-4-Termine auf Slot 2 verschieben

## Ausgangslage (geprüft)

Bei LIMEX gibt es aktuell **6 zukünftige Termine auf Slot 4**. Slot 2 läuft 09:00–16:00 (Mittagspause 12:00–13:00). Slot 4 startet um 08:00 — die frühen Termine liegen also vor Slot-2-Beginn und rutschen auf den nächsten freien 10-Minuten-Slot ab 09:00.

## Regeln

1. `slot_index` 4 → **2**.
2. Ist die Uhrzeit auf Slot 2 bereits belegt (oder vor 09:00), wird in 10-Minuten-Schritten weitergeschoben, bis frei.
3. Mittagspause 12:00–13:00 wird übersprungen.
4. Keine E-Mails, keine SMS.

## Geplante Zuordnung (6 Termine)

| Datum | Name | Alt (Slot 4) | Neu (Slot 2) | Grund |
|---|---|---|---|---|
| Di 01.09. | Nadine Korinth | 08:00 | 09:10 | vor 09:00; 09:00 belegt |
| Di 01.09. | Julia Tolstov | 08:20 | 09:20 | nächster freier |
| Do 03.09. | Ramon Lara | 08:20 | 09:00 | vor 09:00, 09:00 frei |
| Fr 04.09. | Vera Hille | 10:00 | 10:10 | 10:00 belegt |
| Mo 28.09. | Monique Strohmeier | 08:40 | 09:00 | vor 09:00, 09:00 frei |
| Mi 30.09. | Bernard Vrkic | 08:00 | 09:00 | vor 09:00, 09:00 frei |

## Technisch

6 gezielte `UPDATE`s auf `interview_appointments` (`slot_index = 2`, ggf. neue `appointment_time`). Keine Code-Änderungen, keine Benachrichtigungen.
