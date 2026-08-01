# Pro-Slot-Zeitplan für Bewerbungsgespräche

Aktuell gibt es pro Branding genau eine Zeitkonfiguration für Bewerbungsgespräche (Startzeit, Endzeit, Intervall, Wochentage, Wochenendzeiten) plus eine gemeinsame Blockierungsliste. „Slots pro Uhrzeit" legt nur fest, wie oft dieselbe Uhrzeit buchbar ist.

Ziel: Jeder Slot (Slot 1, Slot 2, …) bekommt eigene Startzeit, Endzeit, verfügbare Wochentage, Wochenendzeiten und eigene Blockierungen. Das Intervall bleibt für alle Slots identisch.

## Datenbank

- `branding_schedule_settings`: neue Spalte `slot_index` (Ganzzahl, Standard 1). Der bestehende Eindeutigkeits-Schlüssel wird auf (Branding, Typ, Slot-Index) erweitert; vorhandene Zeilen werden Slot 1. Intervall und „Slots pro Uhrzeit" werden weiterhin nur aus Slot 1 gelesen (Slot 1 = Leitzeile).
- `schedule_blocked_slots`: neue Spalte `slot_index` (nullbar). `NULL` = für alle Slots blockiert (Altbestand bleibt gültig), Zahl = nur dieser Slot.
- Trial-/Erster-Arbeitstag-Zeitplan bleibt unverändert (dort gibt es keine Mehrfachslots).

## Admin-UI (`/admin/zeitplan`, Tab „Bewerbungsgespräche")

- Oben bleibt das Feld „Slots pro Uhrzeit" (1–10) und das Intervall — beides global für alle Slots.
- Darunter Unter-Tabs „Slot 1 … Slot N" (Anzahl folgt „Slots pro Uhrzeit").
- Jeder Slot-Tab enthält: Startzeit, Endzeit, verfügbare Wochentage, optionale Wochenendzeiten sowie den eigenen Kalender-Blocker inkl. Liste der blockierten Zeitfenster dieses Slots.
- Beim Erhöhen der Slot-Anzahl werden neue Slots mit den Werten von Slot 1 vorbelegt; beim Verringern bleiben die Daten in der DB erhalten, werden aber nicht mehr angezeigt/genutzt.
- Eine Kopier-Aktion „Einstellungen von Slot 1 übernehmen" pro Slot zur schnellen Angleichung.

## Öffentliche Buchungsseite (`/bewerbungsgespraech`)

Die Verfügbarkeitslogik wird umgestellt:
1. Alle Slot-Konfigurationen des Brandings laden.
2. Für ein Datum: Kapazität einer Uhrzeit = Anzahl der Slots, deren Wochentag passt, deren Zeitfenster die Uhrzeit enthält und für die die Uhrzeit nicht blockiert ist (weder slot-spezifisch noch global).
3. Eine Uhrzeit wird angezeigt, solange die Anzahl vorhandener Buchungen kleiner als diese Kapazität ist.
4. Ein Tag wird nur ausgegraut, wenn kein Slot an diesem Wochentag aktiv ist.
Die bestehende 12-Stunden-Vorlauf-Regel bleibt unverändert.

## Auswirkung auf die Caller-Zuweisung

Die Slot-Nummer der Caller (`interview_slots_for_branding`) wird weiterhin aus der Buchungsreihenfolge je Uhrzeit vergeben. Hinweis: Sie entspricht damit nicht zwingend dem konfigurierten Slot-Index — falls die Caller-Zuordnung strikt an die neuen Slot-Konfigurationen gekoppelt werden soll, wäre das ein separater Folgeschritt.

## Technische Details

- Migration mit `ALTER TABLE`, Backfill auf Slot 1, neuer Unique-Index, angepasste RLS-Grants nicht nötig (bestehende Policies gelten weiter).
- `AdminZeitplan.tsx` wird in eine Slot-Tab-Struktur umgebaut; `BrandingScheduleForm` und der Blocker-Bereich werden pro Slot-Index parametrisiert.
- `Bewerbungsgespraech.tsx` lädt statt `maybeSingle()` alle Slot-Zeilen und berechnet Kapazität pro Uhrzeit.
