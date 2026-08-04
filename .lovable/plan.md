# Vorlaufzeit pro Branding konfigurierbar

Aktuell ist die Vorlaufzeit für Bewerbungsgespräch-Termine fest auf 12 Stunden im Code der öffentlichen Buchungsseite hinterlegt. Sie soll pro Branding im Zeitplan einstellbar sein — Standard bleibt 12 Stunden.

## Was gebaut wird

1. **Datenbank**: Neues Feld `min_lead_time_hours` in `branding_schedule_settings` mit Standardwert 12. Gilt wie Intervall und Slot-Anzahl global pro Branding (Slot 1 ist führend, wird auf alle Slots synchronisiert).

2. **Admin-Zeitplan (`/admin/zeitplan`)**: In den globalen Einstellungen (Slot 1, Bereich mit Intervall/Slots pro Uhrzeit) ein neues Feld "Vorlaufzeit (Stunden)" — Zahleneingabe, 0 bis 168 Stunden. Speichern läuft über den bestehenden Speichern-Button; der Wert wird wie das Intervall auf alle Slots des Brandings gespiegelt.

3. **Öffentliche Buchungsseite (Bewerbungsgespräch)**: Statt der fixen 12 Stunden wird der Branding-Wert geladen und zur Filterung der wählbaren Uhrzeiten genutzt. Fehlt der Wert, greift 12 Stunden als Fallback. Bei 0 Stunden sind alle künftigen Zeiten buchbar.

## Technische Details

- Migration: `ALTER TABLE public.branding_schedule_settings ADD COLUMN min_lead_time_hours integer NOT NULL DEFAULT 12;` — bestehende Zeilen erhalten damit automatisch 12.
- `src/pages/admin/AdminZeitplan.tsx`: Feld in `SettingsForm` (nur bei `showSlotsPerTime`/Slot 1), Übergabe in `saveSettingsMutation`, Sync-Block analog `slot_interval_minutes`.
- `src/pages/Bewerbungsgespraech.tsx`: `availableTimeSlots` (aktuell Zeile 213) nutzt `settings?.min_lead_time_hours ?? 12` statt der Konstante 12.
- Der Trial-Day/1.-Arbeitstag-Zeitplan bleibt unverändert.
