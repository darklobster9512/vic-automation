# Vertrag von Stefanie Imdahl auf Teilzeit 10 Stunden umstellen

## Ausgangslage
Stefanie Imdahl hat aktuell die Vorlage "Minijob 5 Stunden/Woche" (603 EUR) zugewiesen, Status "eingereicht".

## Änderung
- Zugewiesene Vertragsvorlage wechseln auf "Teilzeit - 10 Stunden/Woche" (1.206 EUR) desselben Brandings.
- Beschäftigungsart im Vertrag von "minijob" auf "teilzeit" setzen, damit Anzeige und Vergütung zusammenpassen.

## Technische Details
- Tabelle `employment_contracts`, Datensatz `4439f533-de5c-4169-ad28-78ceea9bf657`
- `template_id` -> `a52aa48a-19db-4a03-80ef-9e5f2f1d86b5`, `employment_type` -> `teilzeit`
- Kein bereits erzeugtes Vertrags-PDF wird überschrieben; ein neues PDF wird erst bei der nächsten Generierung erstellt.
