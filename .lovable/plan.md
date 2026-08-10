# Langsamkeit bei /admin/bewerbungen beheben

Es liegt nicht am VPS und nicht an der Supabase-Datenbank. Die Seite rendert alle Bewerbungen des aktiven Tabs gleichzeitig — aktuell sind das 1066 Einträge im Tab „Neu“, 1279 in „Bewerbungsgespräch“ und 635 in „Termin gebucht“. Jede Tabellenzeile enthält Checkbox, Badges, Tooltips und Aktions-Buttons.

Der Sekunden-Countdown der Queue schreibt jede Sekunde in den Seiten-State. Dadurch wird bei jedem Tick die komplette Tabelle mit über tausend Zeilen neu gerendert — deshalb dauert „eine Sekunde“ mehrere Sekunden, und deshalb wirkt die ganze Seite träge.

## Umsetzung

1. Countdown und Fortschrittsleiste aus dem Seiten-State herauslösen: eine eigene kleine Komponente unten am Bildschirmrand, die ihren Tick-State selbst hält. Die Tabelle wird dadurch beim Herunterzählen nicht mehr neu gerendert.
2. Den Countdown an eine absolute Ziel-Uhrzeit binden statt an aufsummierte 1-Sekunden-Timer, damit eine eingestellte Pause von 60 Sekunden exakt 60 reale Sekunden dauert (kein Drift).
3. Die Tabelle nicht mehr komplett auf einmal rendern: eine Anzeige-Begrenzung pro Tab mit Nachladen beim Scrollen bzw. „Mehr anzeigen“. Das beschleunigt Tabwechsel, Suche, Auswahl und Checkbox-Klicks spürbar.
4. Die Tabellenzeile als memoisierte Komponente auslagern, damit einzelne Auswahländerungen nicht alle Zeilen neu rendern.
5. „Alle auswählen“ und die Queue arbeiten weiterhin auf allen passenden Bewerbungen, nicht nur auf den sichtbaren.

## Validierung

- Mit kurzer Testpause prüfen, dass der Countdown im Sekundentakt der echten Uhr läuft.
- Prüfen, dass Tabwechsel, Scrollen und Checkbox-Klicks ohne merkliche Verzögerung reagieren.
- Prüfen, dass Zähler, Fehleranzeige, Abbrechen und Einzel-Akzeptieren unverändert funktionieren.

## Technische Details

- Änderungen nur in `src/pages/admin/AdminBewerbungen.tsx` (plus ggf. eine neue Komponentendatei für Fortschrittsleiste und Tabellenzeile).
- Keine Datenbankänderung, keine Änderung an der Akzeptierungs-Logik oder an E-Mail/SMS-Versand.
