# Slot deaktivieren: keine neuen Buchungen mehr

## Ziel

Pro Slot (Spur) im Bewerbungsgespräch-Zeitplan ein Schalter „Neue Buchungen deaktiviert". Bestehende Termine auf diesem Slot bleiben unverändert sichtbar und gültig — es kann nur nichts Neues mehr darauf gebucht werden.

## Was gebaut wird

**1. Schalter im Admin-Zeitplan**
Im Slot-Formular (pro Slot-Tab) kommt oben ein Toggle „Neue Buchungen deaktiviert". Ist er aktiv, zeigt der Slot-Tab einen kleinen Hinweis-Badge („Gesperrt"), damit man auf einen Blick sieht, welche Spur zu ist. Der Wert wird nur für diesen Slot gespeichert und nicht auf andere Slots synchronisiert.

**2. Öffentliche Buchungsseite berücksichtigt den Schalter**
Ein gesperrter Slot bietet keine Zeiten mehr an. Eine Uhrzeit ist nur wählbar, wenn mindestens eine nicht gesperrte, nicht blockierte und freie Spur existiert. Sind alle verbleibenden Spuren belegt oder gesperrt, wird die Uhrzeit ausgegraut. Sind alle Spuren eines Tages gesperrt, ist der Tag nicht mehr wählbar.

**3. Buchung serverseitig absichern**
Die atomare Buchungsfunktion vergibt keine gesperrte Spur mehr — auch nicht, wenn jemand eine veraltete Seite offen hat. In dem Fall erscheint die Meldung, dass der Termin nicht mehr verfügbar ist.

**4. Bestandstermine bleiben unangetastet**
Vorhandene Termine auf gesperrten Spuren werden weiterhin angezeigt (Admin-Liste, Caller-API, Slot-Auflösung). Es werden keine Termine verschoben oder gelöscht.

## Technische Details

- Migration: Spalte `disabled boolean not null default false` auf `branding_schedule_settings` (gilt pro `slot_index`, primär für `schedule_type = 'interview'`).
- Migration: `book_interview_public` — Kandidaten-Spuren zusätzlich filtern auf `COALESCE(lane.disabled, false) = false`; Fallback auf die Slot-1-Zeile behält deren `disabled`-Wert.
- Migration: `resolved_interview_slots_for_branding` — die automatische Nachvergabe wählt keine gesperrten Spuren mehr; manuell gesetzte `slot_index` bleiben unverändert, damit Bestandstermine sichtbar bleiben.
- `src/pages/admin/AdminZeitplan.tsx`: `disabled` im `SettingsForm` als Switch (nur bei `schedule_type = 'interview'`), im Upsert mitschreiben, aus der Slot-Synchronisierung ausschließen; Badge am Slot-Tab.
- `src/pages/Bewerbungsgespraech.tsx`: `disabled` in der `lanes`-Berechnung übernehmen und gesperrte Spuren mit leeren Zeiten behandeln, sodass `availableDays`, `TIME_SLOTS` und die Belegungsprüfung sie ignorieren.
