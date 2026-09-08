# Slot-2-Termine heute umstellen (Vendis, Codebricks, PointView)

## Ziel
Alle heutigen Bewerbungsgespräch-Termine, die aktuell auf Slot 2 liegen, werden auf Slot 1 gesetzt und um 10 Minuten nach hinten verschoben.

## Betroffene Termine (heute, 08.09.2026)
- Codebricks: 4 Termine (09:00, 09:40, 10:00, 11:00) → 09:10, 09:50, 10:10, 11:10
- Vendis: 2 Termine (09:00, 11:00) → 09:10, 11:10
- PointView: 1 Termin (10:00) → 10:10

## Vorgehen
- Nur diese 7 Termine werden angepasst: Slot wird auf 1 gesetzt, Uhrzeit +10 Minuten.
- Alle anderen Termine, Daten und Status bleiben unverändert.
- Es werden keine SMS, E-Mails oder Telegram-Nachrichten verschickt.
- Danach Kontrolle, dass es je Uhrzeit keine Doppelbelegung gibt.

## Technisch
Ein einzelnes Daten-Update auf `interview_appointments` (kein Schema-Wechsel, keine Code-Änderung): gefiltert über `appointment_date = current_date`, `slot_index = 2` und die Brandings der zugehörigen Bewerbung; gesetzt werden `appointment_time = appointment_time + interval '10 minutes'` und `slot_index = 1`.
