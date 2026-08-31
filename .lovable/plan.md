# Heutige Slot-4-Termine (LIMEX) auf Slot 2 verschieben

## Ausgangslage
Heute (31.08.2026) gibt es bei LIMEX **10 Termine in Slot 4**. Slot 2 hat Arbeitszeiten **09:00–16:00** (Mittagspause 12:00–13:00) — die drei frühen Slot-4-Termine (08:00–08:40) liegen mit +10 Min **vor** Slot-2-Beginn und rutschen deshalb auf den nächsten freien Slot-2-Platz ab 09:00.

## Regeln
1. `slot_index` 4 → **2**, Uhrzeit **+10 Minuten**.
2. Ist die Zielzeit in Slot 2 schon belegt (oder durch eine vorherige Verschiebung vergeben), wird in **10-Minuten-Schritten weitergeschoben**, bis frei.
3. Mittagspause 12:00–13:00 wird übersprungen; Start frühestens 09:00.
4. Status, Erinnerungs-Zähler etc. bleiben unverändert.

## Geplante Zuordnung (10 Termine)

| Name | Alt (Slot 4) | Neu (Slot 2) | Grund |
|---|---|---|---|
| Siegmund Baumgärtner | 08:00 | 09:20 | vor 09:00; 09:00/09:10 belegt |
| Christian Sekenka | 08:20 | 09:30 | nächster freier |
| Sibylle Reinauer | 08:40 | 09:50 | 09:40 belegt |
| Thabea Freyberg | 09:00 | 10:30 | Kaskade (09:10–10:20 belegt) |
| Jacqueline Corinn Herre | 09:10 | 10:40 | Kaskade |
| Vinu Katyal | 09:40 | 10:50 | Kaskade |
| Johann Grundner | 10:00 | 11:30 | Kaskade |
| Michael Suthoff | 10:20 | 11:50 | Kaskade |
| Elke Eckert | 11:00 | 13:40 | Kaskade über Mittagspause |
| Arno Löwner | 13:00 | 13:50 | 13:10–13:40 belegt |

## Technisch
Ein SQL-Update pro Termin (10 Updates auf `interview_appointments`: `slot_index = 2`, `appointment_time` neu) über das Run-SQL-Tool, Branding LIMEX (`371a2e6c-…`), Datum = heute. Keine Code-Änderungen, keine Benachrichtigungen.

## Hinweis
Durch die Kaskade landen einige Termine deutlich später als +10 Min (z. B. Freyberg 09:00 → 10:30). Alternative: Termine ohne Konflikt nur +10 Min schieben und die drei Früh-Termine unverschoben in Slot 2 lassen (08:10/08:30/08:50, außerhalb der Slot-2-Zeiten). Bei Freigabe gilt die Tabelle oben.
