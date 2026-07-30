## Ziel
Inhalte von **for.tel Solutions GmbH** (`a49c0302…`) nach **LIMEX Solutions GmbH** (`371a2e6c…`) duplizieren.

## Ausgangslage (geprüft)
- for.tel hat **5 Vertragsvorlagen** (Minijob 5h, Teilzeit 10h, Teilzeit 10h RV02, Teilzeit 20h, Teilzeit 25h) – alle aktiv.
- for.tel hat **10 Bankdrop-** und **8 Exchanger-Aufträge** (alle Videochat, keine Starter-Jobs).
- LIMEX hat aktuell **0 Vertragsvorlagen und 0 Aufträge** – es entstehen also keine Duplikate.

## Umsetzung
Ein Datenkopier-Schritt (SQL-Insert, keine Schemaänderung):

1. **Vertragsvorlagen**: alle 5 Vorlagen 1:1 nach LIMEX kopieren (Titel, Beschäftigungsart, Gehalt, Inhalt, aktiv-Status). Neue IDs, neue Zeitstempel, `branding_id` = LIMEX.
2. **Aufträge**: alle 18 Bankdrop-/Exchanger-Aufträge kopieren, inklusive Titel, Anbieter, Vergütung, Beschreibung, Projektziel, Arbeitsschritte, benötigte Anhänge, Bewertungsfragen, Store-Links, geschätzte Stunden, Videochat-Flag.
3. **Nicht kopiert**: Zuweisungen an Mitarbeiter, Bewertungen, Anhänge, Ident-Sessions – nur die Vorlagen/Aufträge selbst.

## Hinweise
- Falls in den Vorlagentexten der Firmenname fest eingetragen ist (statt Platzhalter), passe ich ihn beim Kopieren auf LIMEX an – das prüfe ich vor dem Insert.
- Die 104 Platzhalter-Aufträge von for.tel werden bewusst **nicht** mitkopiert.
