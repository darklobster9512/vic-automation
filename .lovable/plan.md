# 16:00 Uhr wird trotz freiem Slot 3 als belegt angezeigt

## Ursache (in der Datenbank geprüft)

Für Fr, 07.08.2026, 16:00 Uhr bei LIMEX Solutions gilt:

```text
Slot 1   16:00  blockiert (schedule_blocked_slots)
Slot 2   endet um 16:00  -> bietet 16:00 gar nicht an
Slot 3   16:00  frei und nicht blockiert
Buchung  16:00  Igor Dmitrowicz, manuell auf slot_index = 2
```

Zwei Dinge greifen ineinander:

1. Die Buchungsseite prüft die Belegung **nicht pro Spur**. Sie zählt nur, wie viele Termine auf einer Uhrzeit liegen, und vergleicht das mit der Anzahl der an dieser Uhrzeit verfügbaren Spuren. Verfügbar ist um 16:00 nur Slot 3 (Kapazität 1), gebucht ist 1 Termin — also gilt die Uhrzeit als voll, obwohl der einzige Termin auf Slot 2 liegt.
2. Der Termin von Igor Dmitrowicz steht manuell auf Slot 2, obwohl Slot 2 um 16:00 laut Zeitplan (Endzeit 16:00) gar nicht mehr existiert. Solche Termine „verbrauchen" heute Kapazität einer fremden Spur.

Die RPC `interview_booked_slots_for_branding`, die die Buchungsseite nutzt, liefert aktuell nur Datum und Uhrzeit — die Slot-Zuordnung kommt dort nie an.

## Was gebaut wird

**1. Belegung spurgenau berechnen**
Die Buchungsseite bekommt zu jedem gebuchten Termin auch die Slot-Nummer (manuell gesetzt oder automatisch nach Buchungsreihenfolge ermittelt). Eine Uhrzeit gilt nur noch dann als ausgebucht, wenn **jede** an dieser Uhrzeit verfügbare und nicht blockierte Spur wirklich belegt ist. Ein Termin auf einer Spur, die es zu dieser Uhrzeit nicht gibt (z. B. Slot 2 nach dessen Endzeit), blockiert keine andere Spur mehr.

**2. Termin von Igor Dmitrowicz korrigieren**
Sein Termin am 07.08.2026 16:00 Uhr wird von Slot 2 auf Slot 3 gesetzt (die Spur, die zu dieser Uhrzeit tatsächlich offen ist). Datum und Uhrzeit bleiben unverändert, es werden keine E-Mails oder SMS ausgelöst. Nach der Korrektur bleibt 16:00 dennoch als belegt angezeigt, da Slot 1 blockiert und Slot 2 beendet ist — das ist dann korrekt. Falls 16:00 weiterhin buchbar sein soll, muss zusätzlich die Blockierung auf Slot 1 um 16:00 entfernt werden (sag Bescheid, dann nehme ich das mit auf).

**3. Diagnose im Admin**
Keine UI-Änderung nötig; die bestehende Slot-Anzeige unter /admin/bewerbungsgespraeche zeigt die Korrektur direkt an.

## Technische Details

- Migration: `interview_booked_slots_for_branding` erweitern auf `RETURNS TABLE(appointment_date date, appointment_time time, slot_index integer)` und die Slot-Auflösung aus `interview_slots_for_branding` (manuell vor automatisch, Reihenfolge nach `created_at`) übernehmen.
- `src/pages/Bewerbungsgespraech.tsx`: In `bookedTimesForDate` statt Zählung eine Menge belegter Spuren pro Uhrzeit bilden; `unavailable`, wenn alle Spuren aus `laneTimesForDate` (abzüglich lane-/global-blockierter) in dieser Menge liegen bzw. keine Spur verfügbar ist. Termine mit Slot-Nummer außerhalb der verfügbaren Spuren werden ignoriert; Termine ohne auflösbare Spur füllen die erste freie Spur.
- Datenkorrektur: `UPDATE public.interview_appointments SET slot_index = 3` für den Termin Igor Dmitrowicz am 2026-08-07 16:00.
