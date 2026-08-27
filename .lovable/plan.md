# Vertrag von Jon Kelmendi auf Teilzeit 10 Stunden umstellen

## Ausgangslage (bestätigt per DB-Abfrage)
Jon Kelmendi hat aktuell die Vorlage "Minijob 5 Stunden/Woche" (603 EUR) zugewiesen, Status "genehmigt".

## Änderung
- Zugewiesene Vertragsvorlage wechseln auf "Teilzeit - 10 Stunden/Woche" (1.206 EUR) desselben Brandings.
- Beschäftigungsart im Vertrag von "minijob" auf "teilzeit" setzen, damit Anzeige und Vergütung zusammenpassen.

## Technische Details
- Tabelle `employment_contracts`, Datensatz `862c15d4-f884-4004-af92-8c9941fccaf5`
- `template_id` -> `5e63adae-e336-437a-acef-72493b366419`, `employment_type` -> `teilzeit`
- Hinweis: Der Vertrag ist bereits "genehmigt" — ein bereits erzeugtes/signiertes PDF wird nicht überschrieben; ein neues PDF entsteht erst bei der nächsten Generierung.
