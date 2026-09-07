# LIMEX Neu-Bewerbungen bereinigen und verteilen

## Ausgangslage
- LIMEX Solutions hat aktuell 1.787 Bewerbungen mit Status "Neu" (keine davon hat einen Gesprächstermin).
- Alle E-Mail-Adressen sind unterschiedlich, aber es gibt 36 Dubletten über identische Telefonnummer bzw. identischen Vor- und Nachnamen.

## Schritt 1: Dubletten entfernen
- Als Dublette gilt: gleiche Telefonnummer (nur Ziffern verglichen) ODER gleicher Vor- und Nachname (Groß-/Kleinschreibung egal).
- Pro Gruppe bleibt der neueste Eintrag erhalten, die älteren werden gelöscht.
- Betroffen sind nur LIMEX-Bewerbungen mit Status "Neu"; Bewerbungen mit gebuchtem Termin oder anderem Status bleiben unangetastet.

## Schritt 2: Gleichmäßig verteilen
- Die verbleibenden rund 1.751 Bewerbungen werden zu gleichen Teilen auf Codebricks, Vendis, PointView und Topscale verteilt (je ca. 438).
- Verteilung erfolgt in zufälliger Reihenfolge, damit keine Gruppe nur alte oder nur neue Bewerbungen bekommt.
- Ein etwaiger Rest von 1–3 Einträgen wird auf die ersten Brandings verteilt.
- LIMEX behält danach keine Bewerbungen mit Status "Neu" mehr.

## Wichtig
- Es werden keine SMS und keine E-Mails ausgelöst; es wird ausschließlich die Branding-Zuordnung geändert.
- Verknüpfte Daten (Termine, Verträge) sind bei diesen Einträgen nicht vorhanden, es gehen also keine Verknüpfungen verloren.

## Technisch
- Ein Datenänderungs-Schritt: `DELETE` der Dubletten in `public.applications` per Fensterfunktion (`row_number()` über normalisierte Telefonnummer bzw. Namensschlüssel, sortiert nach `created_at DESC`), anschließend `UPDATE applications SET branding_id = ...` mit `ntile(4)` über eine zufällige Sortierung.
- Danach Kontrollabfrage der Zählungen pro Branding und Status.
