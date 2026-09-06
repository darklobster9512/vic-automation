# Zeitplan: eigene Zeiten pro Wochentag und Slot

## Ziel
Im Zeitplan für Bewerbungsgespräche soll man pro Slot (Slot 1, 2, 3 …) für jeden Wochentag eigene Start- und Endzeiten setzen können — z. B. Slot 1: Montag 08:00–12:00, Dienstag 12:00–16:00.

## So sieht es aus
- Im Zeitplan bleibt oben die bisherige allgemeine Start-/Endzeit als Standard für den gewählten Slot.
- Neu darunter: ein Bereich „Zeiten pro Wochentag“. Für jeden aktivierten Wochentag gibt es eine Zeile mit Von/Bis. Leer bzw. „Standard“ heißt: es gelten die allgemeinen Zeiten.
- Die Wochenendzeiten bleiben als Kurzform erhalten; eine Wochentags-Zeile hat immer Vorrang, wenn sie gesetzt ist.
- Jeder Slot hat seine eigenen Wochentags-Zeiten (die Einstellung wird pro Slot gespeichert).

## Wirkung
- Buchungsseite: die angebotenen Uhrzeiten je Slot richten sich nach der Regel des jeweiligen Wochentags; Mittagspause, Vorlaufzeit und blockierte Zeiten wirken wie bisher weiter.
- Server: die Buchungsprüfung akzeptiert nur Zeiten, die in der Wochentags-Regel des Slots liegen — auch bei manipuliertem Aufruf.
- Bestehende Einstellungen bleiben unverändert gültig, solange keine Wochentags-Zeiten gesetzt sind.

## Technische Umsetzung
1. Migration: neue Spalte `branding_schedule_settings.day_time_overrides jsonb NOT NULL DEFAULT '{}'` im Format `{"1":{"start":"08:00","end":"12:00"}, "2":{...}}` (ISO-Wochentag 1–7).
2. `src/pages/admin/AdminZeitplan.tsx`: In `BrandingScheduleForm` einen Editor für die Wochentags-Zeiten ergänzen (nur für aktivierte Tage), Wert in `saveSettingsMutation`/Upsert mitschreiben; beim Anlegen fehlender Slot-Zeilen mitkopieren.
3. `src/pages/Bewerbungsgespraech.tsx`: `lanes` um `dayOverrides` erweitern; in `laneTimesForDate` die Reihenfolge Override → Wochenendzeit → Standardzeit anwenden.
4. SQL-Funktionen `book_interview_public` und `resolved_interview_slots_for_branding` (aktuellste Definitionen) so erweitern, dass die Start-/Endzeit-Auflösung zuerst `day_time_overrides -> isodow` je Slot bzw. Primär-Zeile prüft, danach wie bisher Wochenende/Standard.
5. Typecheck ausführen; bestehende Slot-, Pausen- und Blockierlogik unverändert lassen.

Nicht enthalten: Änderungen an Probetag, 1. Arbeitstag oder Caller-Zugängen — diese behalten die bisherige Logik.
