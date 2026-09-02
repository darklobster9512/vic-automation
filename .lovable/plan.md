# Ident-Info-Vorlagen von LIMEX nach Vendis kopieren

## Ausgangslage
- LIMEX Solutions GmbH hat 9 Ident-Info-Vorlagen.
- Vendis Development Services GmbH hat aktuell 0 Vorlagen.

## Vorgehen
- Alle 9 Vorlagen (Name + Inhalt) von LIMEX als neue Datensätze für Vendis anlegen.
- Neue IDs und aktuelle Zeitstempel; die LIMEX-Vorlagen bleiben unverändert.
- Danach kurze Kontrolle, dass Vendis 9 Vorlagen hat.

## Technisch
Ein einziges INSERT ... SELECT in `ident_info_templates`: `branding_id` wird auf `5b5c01e7-101a-4ce5-b65b-221a2eb8d653` gesetzt, Quelle ist `371a2e6c-8a38-4c27-b4a4-34cf38694b1b`.
