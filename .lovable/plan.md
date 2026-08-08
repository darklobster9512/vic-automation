# 1. Arbeitstag-Termine wie Bewerbungsgespräche darstellen

## Was sich ändert

**1. Kein „Zukünftige Termine"-Button mehr**
Die Hauptansicht zeigt ab heute alle kommenden Termine chronologisch — nicht mehr nur heute/morgen. Der Umschalter „Vergangene Termine" bleibt.

**2. Vergangen erst ab Mitternacht**
Aktuell rutscht ein Termin schon 3 Stunden nach seiner Uhrzeit in „Vergangene Termine". Künftig zählt nur das Datum: alles ab heute 00:00 Uhr bleibt in der Hauptansicht.

**3. Endlose Seite ohne Pagination**
Die Seiten-Blätterung entfällt komplett; alle passenden Termine werden geladen und untereinander angezeigt.

**4. Tages-Trenner**
Bei jedem Datumswechsel eine Überschriftszeile mit Kalender-Icon: „Heute", „Morgen" oder z. B. „Mi., 12.08.2026". Darunter die Termine des Tages wie bisher als Tabellenzeilen.

## Technische Umsetzung

Alles in `src/pages/admin/AdminErsterArbeitstag.tsx`:

- `ViewMode` auf `"upcoming" | "past"` reduzieren; `page`/`PAGE_SIZE`/Pagination-UI und den „Zukünftige Termine"-Button entfernen.
- Filter: `upcoming` → `appointment_date >= today` (aufsteigend), `past` → `appointment_date < today` (absteigend). `cutoffTime`/`subHours`/`tomorrow` entfallen.
- Laden aller Zeilen per Batch-Loop mit `.range()` in 1000er-Schritten (Supabase-Zeilenlimit), danach wie bisher Branding-Filter und die Folge-Queries (profiles/applications/templates).
- Gruppenzeile vor der ersten Zeile eines neuen Datums (`TableRow` über alle Spalten) mit `dayLabel()` — gleiche Hilfsfunktion/Optik wie in `AdminBewerbungsgespraeche.tsx`.
- Alle bestehenden Funktionen (Suche, Status-Buttons inkl. Fehlgeschlagen-Dialog, Name-Link zur Mitarbeiterseite, Löschen, BrandingNotes) bleiben unverändert.
- Keine Slot-Farben, da 1. Arbeitstag-Termine kein Slot-System haben.
