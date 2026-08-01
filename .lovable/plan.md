# Mittagspause pro Slot (/admin/zeitplan)

Ziel: Im Bereich „Zeiten blockieren" gibt es je Slot einen Schalter „Mittagspause aktivieren". Ist er an, wählt man Start- und Endzeit (z.B. 12:00–13:00). Alle Zeitfenster in diesem Bereich sind dann für diesen Slot dauerhaft blockiert — an allen Tagen, ohne dass man einzelne Termine im Kalender anklicken muss.

## Datenbank

Drei neue Felder in `branding_schedule_settings` (gelten pro Branding + Zeitplan-Typ + Slot):
- `lunch_break_enabled` (Ja/Nein, Standard: Nein)
- `lunch_break_start` (Uhrzeit, optional)
- `lunch_break_end` (Uhrzeit, optional)

Bestehende Einträge bleiben unverändert (Pause aus).

## Admin-UI

In der Karte „Zeiten blockieren – Slot N":
- Schalter „Mittagspause aktivieren" oben in der Karte.
- Bei aktiviertem Schalter zwei Auswahlfelder „Von" / „Bis" (gleiche 30-Minuten-Liste wie bei den Zeiteinstellungen) plus Speichern.
- Die betroffenen Uhrzeiten werden im Zeitraster darunter als gesperrt dargestellt (mit Hinweis „Mittagspause") und sind nicht anklickbar, damit klar ist, warum sie nicht verfügbar sind.
- Einstellung gilt nur für den aktuell gewählten Slot; andere Slots bleiben unberührt.

Regel: Start muss vor Ende liegen — sonst Hinweis-Toast und kein Speichern. Ein Zeitfenster gilt als in der Pause, wenn es größer/gleich Start und kleiner Ende ist (12:00–13:00 sperrt also 12:00, 12:20, 12:40 – nicht 13:00).

## Öffentliche Buchungsseite

Die Kapazitätsberechnung pro Uhrzeit zieht Slots ab, deren Mittagspause diese Uhrzeit abdeckt. Sind alle aktiven Slots zu dieser Uhrzeit in der Pause, wird die Uhrzeit gar nicht angeboten. Zusätzliche manuelle Blockierungen wirken weiterhin unverändert.

## Technische Details

- Migration: `ALTER TABLE public.branding_schedule_settings ADD COLUMN lunch_break_enabled boolean NOT NULL DEFAULT false, ADD COLUMN lunch_break_start time, ADD COLUMN lunch_break_end time;`
- `AdminZeitplan.tsx`: Mittagspausen-Block als Teil der Blockier-Karte, gespeichert über dieselbe Upsert-Mutation (nur für den aktiven `slot_index`); Zeitraster filtert Pausenzeiten als „gesperrt".
- `Bewerbungsgespraech.tsx`: In `lanes` die drei Felder mitführen und in `laneTimesForDate` die Pausenzeiten des jeweiligen Slots aus dessen Zeitliste entfernen.
- Probetag/1. Arbeitstag bleiben unverändert.
