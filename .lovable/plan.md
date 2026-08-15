# SMS-Konfiguration von LIMEX zu Codebricks kopieren

## Ausgangslage
- LIMEX Solutions GmbH: Absendername "limex", Seven.io-Key, Elitegateway-Key (SMS-Spoof), SMSBot-Key gesetzt (keine Rental-ID), 2 SMS-Spoof-Vorlagen.
- Codebricks GmbH: keinerlei SMS-Konfiguration (kein Absendername, keine Keys, keine Vorlagen).

## Was passiert
1. Branding-Felder von LIMEX auf Codebricks übertragen:
   - Absendername ("limex" wird 1:1 kopiert)
   - Seven.io API-Key
   - Elitegateway API-Key (SMS-Spoof)
   - SMSBot API-Key und Rental-ID
   - Ident-SMS-Einstellung
2. Die 2 SMS-Spoof-Vorlagen (Label/Absender/Text) als neue Einträge für Codebricks anlegen.

Nicht kopiert werden Telefonnummern (separate Ressource) und die globalen SMS-Textvorlagen unter /admin/sms-vorlagen, da diese ohnehin für alle Brandings gelten.

## Offener Punkt
Der Absendername wird als "limex" übernommen. Falls Codebricks einen eigenen Absender braucht (z. B. "Codebricks"), sag kurz Bescheid — dann setze ich den stattdessen.

## Technisch
Ein UPDATE auf `brandings` (Codebricks-Zeile mit den Werten der LIMEX-Zeile) plus ein INSERT-SELECT in `sms_spoof_templates` mit ersetzter `branding_id`. LIMEX bleibt unverändert.
