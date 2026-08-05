# Slot manuell wechseln bei Bewerbungsgesprächen

## Problem

Der Slot eines Gesprächs ist heute nicht gespeichert, sondern wird berechnet: innerhalb einer Datum+Uhrzeit-Gruppe entscheidet die Reihenfolge der Buchung (`created_at`), wer Slot 1, 2, 3 ist. Deshalb lässt er sich aktuell nicht manuell ändern — weder im Admin-Panel noch im Caller-Panel.

## Lösung

Ein fester Slot wird optional pro Termin gespeichert. Wo nichts gesetzt ist, bleibt alles wie bisher (Reihenfolge nach Buchungszeit).

### 1. Datenbank
- Neue Spalte `slot_index` (Zahl, optional) an `interview_appointments`.
- `interview_slots_for_branding` so anpassen, dass ein manuell gesetzter Slot Vorrang hat und nur die übrigen Termine automatisch durchnummeriert werden (die verbleibenden freien Nummern werden nach Buchungszeit vergeben).

### 2. Admin-Oberfläche (/admin/bewerbungsgespraeche)
- Das Slot-Badge in der Uhrzeit-Spalte wird anklickbar (auch wenn nur 1 Slot belegt ist, solange das Branding mehrere Spuren hat).
- Klick öffnet ein kleines Popup mit Auswahl „Slot 1 … Slot N" (N = „Slots pro Uhrzeit" des Brandings) plus Option „Automatisch".
- Beim Speichern:
  - Ist der Ziel-Slot zur selben Datum/Uhrzeit schon belegt, werden die beiden Termine getauscht (der andere bekommt den bisherigen Slot fest zugewiesen) — mit Hinweis im Bestätigungstext.
  - Ist er frei, wird nur der gewählte Termin gesetzt.
- Danach Liste neu laden, Erfolgsmeldung.

### 3. Konsistenz
- Die Slot-Berechnung in der Liste nutzt künftig denselben Vorrang (manuell vor automatisch), damit Anzeige und Caller-Zuordnung identisch sind.
- Das Caller-Panel nutzt bereits `interview_slots_for_branding` und erbt die Änderung automatisch — ein manuell gewechselter Slot landet damit sofort beim richtigen Caller.

## Technische Details
- Migration: `ALTER TABLE public.interview_appointments ADD COLUMN slot_index integer;` plus Neufassung von `interview_slots_for_branding` (manuelle Werte zuerst, Rest per `ROW_NUMBER()` über die freien Nummern).
- Frontend: `src/pages/admin/AdminBewerbungsgespraeche.tsx` — Gruppierungslogik (Zeilen 140–176) berücksichtigt `slot_index`; neues Popover/Dialog am Slot-Badge; Update per `supabase.from("interview_appointments").update({ slot_index })`.
- Slot-Anzahl kommt aus `branding_schedule_settings` (`schedule_type = 'interview'`, `slot_index = 1`, Feld `interview_slots_per_time`).
