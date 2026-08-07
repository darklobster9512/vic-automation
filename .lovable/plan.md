# 16:00 Uhr wird trotz freiem Slot 3 als belegt angezeigt

## Ursache (in der Datenbank geprüft)

Für Fr, 07.08.2026, 16:00 Uhr bei LIMEX Solutions gilt:

```text
Slot 1   16:00  blockiert (schedule_blocked_slots)
Slot 2   endet um 16:00  -> bietet 16:00 gar nicht an
Slot 3   16:00  frei und nicht blockiert
Buchung  16:00  ein Termin, manuell auf slot_index = 2
```

Die Buchungsseite prüft die Belegung **nicht pro Spur**. Sie zählt nur, wie viele Termine auf einer Uhrzeit liegen, und vergleicht das mit der Anzahl der an dieser Uhrzeit verfügbaren Spuren. Verfügbar ist um 16:00 nur Slot 3 (Kapazität 1), gebucht ist 1 Termin — also gilt die Uhrzeit als voll, obwohl dieser Termin auf Slot 2 liegt.

Die RPC `interview_booked_slots_for_branding`, die die Buchungsseite nutzt, liefert nur Datum und Uhrzeit — die Slot-Zuordnung kommt dort nie an.

## Was gebaut wird

**Belegung spurgenau berechnen**
Die Buchungsseite bekommt zu jedem gebuchten Termin auch die Slot-Nummer (manuell gesetzt oder automatisch nach Buchungsreihenfolge ermittelt). Eine Uhrzeit gilt nur noch dann als ausgebucht, wenn **jede** an dieser Uhrzeit verfügbare und nicht blockierte Spur wirklich belegt ist. Ein Termin auf einer Spur, die es zu dieser Uhrzeit nicht gibt (z. B. Slot 2 nach dessen Endzeit), blockiert keine andere Spur mehr.

Es werden keine bestehenden Termine geändert und keine Blockierungen entfernt.

## Technische Details

- Migration: `interview_booked_slots_for_branding` erweitern auf `RETURNS TABLE(appointment_date date, appointment_time time, slot_index integer)` und die Slot-Auflösung aus `interview_slots_for_branding` (manuell vor automatisch, Reihenfolge nach `created_at`) übernehmen.
- `src/pages/Bewerbungsgespraech.tsx`: In `bookedTimesForDate` statt Zählung eine Menge belegter Spuren pro Uhrzeit bilden; `unavailable`, wenn alle Spuren aus `laneTimesForDate` (abzüglich lane-/global-blockierter) in dieser Menge liegen bzw. keine Spur verfügbar ist. Termine mit Slot-Nummer außerhalb der verfügbaren Spuren belegen keine andere Spur.
