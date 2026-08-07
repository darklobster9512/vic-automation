# Bewerbungsgespräche: Tagesgruppen, endlose Liste, Slot-Farben

## Was sich ändert

**1. Vergangen = erst ab Mitternacht**
Aktuell rutscht ein Termin schon 3 Stunden nach seiner Uhrzeit in „Vergangene Termine“. Künftig zählt nur das Datum: alles ab heute 00:00 Uhr bleibt in der Hauptansicht, erst Termine von gestern und früher gelten als vergangen.

**2. Kein „Zukünftige Termine“-Button, keine Seiten-Blätterung**
- Die Hauptansicht zeigt ab heute **alle** kommenden Termine, chronologisch, ohne Begrenzung auf heute/morgen.
- Die Pagination (Seite 1 von X, Zurück/Weiter) entfällt komplett — die Seite läuft einfach nach unten durch.
- Der Button „Vergangene Termine“ bleibt als Umschalter erhalten (dort dann ebenfalls ohne Pagination, absteigend sortiert).

**3. Tages-Trenner wie im Referenzprojekt**
Bei jedem Datumswechsel erscheint eine kleine Überschriftszeile mit Kalender-Icon: „Heute“, „Morgen“ oder z. B. „Mi., 12.08.2026“. Innerhalb einer Tagesgruppe folgen die Termine wie bisher als Zeilen.

**4. Farbe pro Slot**
Jeder Slot bekommt eine feste eigene Farbe (Slot 1 blau, Slot 2 grün, Slot 3 orange, Slot 4 violett, Slot 5 rosé — danach wiederholend). Das Slot-Badge wird entsprechend eingefärbt, zusätzlich bekommt jede Zeile links einen dünnen Farbbalken in der Slot-Farbe, damit die Unterschiede auf einen Blick sichtbar sind. Manuell gesetzte Slots bleiben zusätzlich erkennbar (kräftige Füllung vs. dezente Füllung bei automatischer Zuordnung).

## Technische Umsetzung

Alles in `src/pages/admin/AdminBewerbungsgespraeche.tsx`:

- `viewMode` reduziert auf `"upcoming" | "past"`; `page`/`PAGE_SIZE`/`totalPages` und die Pagination-UI entfernen, `.range(...)` durch das Laden aller passenden Zeilen ersetzen (Batch-Loop mit `.range()` in 1000er-Schritten wegen des Supabase-Zeilenlimits).
- Filter: `upcoming` → `appointment_date >= today` (aufsteigend), `past` → `appointment_date < today` (absteigend). `cutoffTime`/`subHours` und der `tomorrow`-Filter entfallen.
- Die bestehende Slot-Berechnung (`_slotIndex`, `_takenSlots`, manuelle `slot_index`-Priorität) bleibt unverändert.
- Tabelle behält Struktur; zusätzlich wird vor der ersten Zeile eines neuen Datums eine Gruppen-Zeile (`TableRow` über alle Spalten) mit `dayLabel()` gerendert („Heute“/„Morgen“/Wochentag + Datum).
- Slot-Farben als semantische Tokens: bestehende `--stat-blue/green/orange/violet/rose` aus `index.css` werden in `tailwind.config.ts` als Farbnamen ergänzt und über eine `slotColor(index)`-Hilfsfunktion auf Badge und Zeilen-Farbbalken angewendet — keine hartcodierten Farbklassen.
- Alle vorhandenen Funktionen (Suche, Status-Dialoge mit Notiz, Slot-Wechsel-Popover, SMS/E-Mail-Buttons, Probetag-Spalte, Löschen) bleiben unangetastet.
