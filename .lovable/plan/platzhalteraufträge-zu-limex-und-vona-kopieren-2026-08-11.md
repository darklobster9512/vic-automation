# Platzhalteraufträge zu LIMEX und VONA kopieren

## Ausgangslage (geprüft)
- for.tel Solutions: 123 Platzhalteraufträge
- LIMEX Solutions: 12 Platzhalteraufträge — alle 12 Titel existieren bereits bei for.tel (also Teilmenge)
- VONA Cloud Solutions: 0 Platzhalteraufträge

## Vorgehen
Alle 123 Platzhalteraufträge von for.tel werden per Datenbank-Kopie übernommen:
- **VONA**: alle 123 werden neu angelegt
- **LIMEX**: nur die 111 fehlenden werden angelegt, die 12 bestehenden bleiben unverändert (keine Duplikate)

Kopiert werden alle inhaltlichen Felder (Titel, Beschreibung, Vergütung, Auftragstyp, Anbieter, Projektziel, Bewertungsfragen, Arbeitsschritte, benötigte Anhänge, App-/Playstore-Links, geschätzte Stunden, Videochat-Kennzeichen). Neue IDs und Erstellungszeitpunkte werden vergeben; Starter-Job-Kennzeichen bleibt wie bei der Vorlage (Platzhalter sind keine Starter-Jobs).

Bestehende Zuweisungen, Bewertungen oder Anhänge werden nicht angefasst.

## Technisch
Eine einzige Daten-Insert-Anweisung auf `public.orders`, gefiltert auf `branding_id = for.tel AND is_placeholder = true`, mit `NOT EXISTS`-Prüfung auf gleichen Titel im Zielbranding. Keine Code- oder Schemaänderungen.
