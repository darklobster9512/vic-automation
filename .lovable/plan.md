# 1.-Arbeitstag-Kalender von LIMEX und Codebricks zusammenlegen

Ziel: Ein bei LIMEX gebuchter 1.-Arbeitstag-Termin blockiert dieselbe Uhrzeit auch bei Codebricks — und umgekehrt. Betrifft ausschließlich den 1.-Arbeitstag-Kalender (Kennenlerngespräche und alles andere bleiben getrennt).

## Was gebaut wird

1. **Kalender-Gruppe in der Datenbank**
   Eine neue Hilfsfunktion liefert zu einem Branding alle Brandings, die sich denselben 1.-Arbeitstag-Kalender teilen. LIMEX Solutions und Codebricks GmbH bilden die erste Gruppe; alle anderen Brandings bleiben allein.

2. **Belegte Termine gruppenweit**
   Die bestehende Funktion, die belegte Termine liefert (`booked_slots_for_branding`), berücksichtigt künftig alle Brandings der Gruppe. Dadurch werden auf der öffentlichen Buchungsseite (`/erster-arbeitstag/:id`) fremde Buchungen automatisch ausgegraut — auf beiden Seiten.

3. **Doppelbuchung serverseitig verhindern**
   Die Buchungsfunktion `book_first_workday_public` prüft Kollisionen und blockierte Zeiten künftig ebenfalls gruppenweit, damit zwei parallele Buchungen nicht dieselbe Uhrzeit belegen können.

4. **Blockierte Zeiten gruppenweit**
   Die Seite lädt blockierte Slots (`first_workday_blocked_slots`, `trial_day_blocked_slots`) künftig für alle Brandings der Gruppe, nicht nur für das eigene.

## Technische Details

- Neue SQL-Funktion `public.fw_calendar_branding_ids(_branding_id uuid) RETURNS SETOF uuid` (SECURITY DEFINER, STABLE): gibt bei LIMEX (`371a2e6c-8a38-4c27-b4a4-34cf38694b1b`) und Codebricks (`56aa260c-f3bc-44d3-a37b-ceb3ba01d2d9`) beide IDs zurück, sonst nur die eigene.
- `booked_slots_for_branding`: `WHERE branding_id = _branding_id` wird zu `WHERE branding_id IN (SELECT fw_calendar_branding_ids(_branding_id))` in allen drei UNION-Zweigen.
- `book_first_workday_public`: Blocked-Slot-Checks (Schritt 3) auf `branding_id IN (SELECT fw_calendar_branding_ids(v_branding_id))` umstellen. Schritt 4 erbt die Gruppenlogik automatisch über `booked_slots_for_branding`.
- `src/pages/ErsterArbeitstag.tsx`: Query `first-workday-blocked-slots-public` nutzt statt `.eq("branding_id", brandingId)` ein `.in("branding_id", groupIds)`; die Gruppen-IDs kommen aus einem kleinen RPC-Aufruf auf `fw_calendar_branding_ids`.
- Zeitfenster, Wochentage und Vorlaufzeit bleiben pro Branding aus `branding_schedule_settings` (schedule_type `trial`) — nur Belegung/Blockierung wird geteilt.

## Hinweis

Die Gruppenzuordnung wird fest in der Funktion hinterlegt. Falls später weitere Brandings verbunden werden sollen, ist das eine kleine Änderung an dieser einen Funktion (oder optional später eine eigene Tabelle mit UI).
