# Ident-Info-Vorlagen von LIMEX zu Codebricks kopieren

## Ausgangslage
- LIMEX Solutions GmbH: 6 Ident-Info-Vorlagen (21btc, BBVA, Deutsche Bank, DKB, ING, Postbank)
- Codebricks GmbH: 0 Vorlagen

## Was gemacht wird
Alle 6 Vorlagen werden 1:1 (Name + Text unverändert) als neue Einträge für Codebricks angelegt. Die LIMEX-Vorlagen bleiben unverändert. Bereits vorhandene gleichnamige Vorlagen bei Codebricks würden übersprungen (aktuell keine).

## Technisch
Ein `INSERT INTO public.ident_info_templates (name, content, branding_id) SELECT ... WHERE NOT EXISTS (...)` mit Codebricks-`branding_id`. Keine Code- oder Schemaänderung.
