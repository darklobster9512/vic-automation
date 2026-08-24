# Aufträge und Vertragsvorlagen von LIMEX zu Vendis kopieren

## Ausgangslage
- LIMEX Solutions GmbH: 143 Aufträge, 4 Vertragsvorlagen (Minijob 5 Std., Teilzeit 10/20/25 Std.)
- Vendis Development Services GmbH: 0 Aufträge, 0 Vertragsvorlagen

## Was passiert
1. **Aufträge**: Alle 143 LIMEX-Aufträge werden 1:1 als neue Einträge für Vendis angelegt (Titel, Anbieter, Vergütung, Beschreibung, Auftragstyp, Projektziel, Arbeitsschritte, Bewertungsfragen, Store-Links, Pflicht-Anhänge, Platzhalter- und Starter-Job-Kennzeichen, Videochat-Flag). Zuweisungen, Bewertungen und Anhänge werden nicht mitkopiert.
2. **Vertragsvorlagen**: Alle 4 Vorlagen werden kopiert; im Vertragstext werden die Unternehmensdaten ersetzt:
   - LIMEX Solutions GmbH → Vendis Development Services GmbH
   - Blankenhainer Str. 5, 12249 Berlin → Neue Schönhauser Str. 2, 10178 Berlin
   - Geschäftsführer Ivan Kulinstev → Sebastian Andre Deutsch
   Gehälter, Stundenzahlen und Beschäftigungsart bleiben unverändert.

LIMEX bleibt komplett unverändert.

## Hinweis
Starter-Jobs werden mitkopiert; dadurch greift bei neuen Vendis-Mitarbeitern die automatische Starter-Job-Zuweisung. Bestehende Vendis-Mitarbeiter bekommen sie nicht rückwirkend – sag Bescheid, falls das gewünscht ist.

## Technisch
Zwei `INSERT ... SELECT`-Statements auf `orders` und `contract_templates` mit ersetzter `branding_id`, bei den Vorlagen zusätzlich verschachtelte `replace()`-Aufrufe auf `content`. Keine Code- oder Schemaänderung.
