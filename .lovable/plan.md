## Ziel
Die Starter-Jobs von **for.tel Solutions GmbH** nach **LIMEX Solutions GmbH** kopieren.

## Ausgangslage (geprüft)
- for.tel hat genau **2 Starter-Jobs** (beide Typ „Platzhalter", Vergütung 0, ca. 0,5 h, kein Videochat):
  - Bewertung / Analyse Onlineshop Seeberger
  - Bewertung / Analyse Onlineshop Thalia
- LIMEX hat aktuell **0 Starter-Jobs** (18 Aufträge insgesamt) – es entstehen keine Duplikate.

## Umsetzung
Ein Datenkopier-Schritt (SQL-Insert, keine Schemaänderung):

1. Beide Starter-Jobs 1:1 nach LIMEX kopieren: Titel, Anbieter, Vergütung, Beschreibung, Projektziel, Arbeitsschritte, benötigte Anhänge, Bewertungsfragen, Store-Links, geschätzte Stunden, Videochat-Flag, Starter-Job-Flag.
2. Neue IDs und Zeitstempel, `branding_id` = LIMEX.
3. Falls im Text ein Firmenname fest hinterlegt ist, wird er beim Kopieren auf LIMEX angepasst (wird vor dem Insert geprüft).

## Hinweis
Es existiert ein Automatismus, der Starter-Jobs neuen Mitarbeitern automatisch zuweist. Nach dem Kopieren erhalten also neue LIMEX-Mitarbeiter diese beiden Aufträge automatisch. Bestehende LIMEX-Mitarbeiter bekommen sie **nicht** rückwirkend – sag Bescheid, falls das gewünscht ist.
