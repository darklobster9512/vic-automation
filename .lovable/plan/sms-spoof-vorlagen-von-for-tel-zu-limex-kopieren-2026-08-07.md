# SMS-Spoof-Vorlagen von for.tel zu LIMEX kopieren

## Ausgangslage
- for.tel Solutions GmbH hat 2 SMS-Spoof-Vorlagen (beide Label "DKB", Absender "DKB").
- LIMEX Solutions GmbH hat aktuell 0 Vorlagen.

## Was passiert
Die 2 Vorlagen werden 1:1 (Label, Absendername, Nachrichtentext) als neue Einträge für LIMEX Solutions angelegt. Die Originale bei for.tel bleiben unverändert.

## Technisch
Ein Daten-Insert in `sms_spoof_templates`: SELECT der for.tel-Zeilen mit ersetztem `branding_id` auf die LIMEX-ID; neue IDs und Zeitstempel per Default.
