# SMS-Konfiguration von for.tel zu VONA kopieren

## Ausgangslage
- for.tel Solutions GmbH: Absendername "for.tel", Seven.io-Key, Elitegateway-Key, SMSBot-Key + Rental-ID gesetzt, 2 SMS-Spoof-Vorlagen.
- VONA Cloud Solutions GmbH: keinerlei SMS-Konfiguration (kein Absendername, keine Keys, keine Vorlagen).

## Was passiert
1. Branding-Felder von for.tel auf VONA übertragen:
   - Absendername (`for.tel` → wird 1:1 kopiert)
   - Seven.io API-Key
   - Elitegateway API-Key (SMS-Spoof)
   - SMSBot API-Key und Rental-ID
   - Ident-SMS-Einstellung (deaktiviert ja/nein)
2. Die 2 SMS-Spoof-Vorlagen (Label/Absender/Text) als neue Einträge für VONA anlegen.

Nicht kopiert werden die 58 Telefonnummern von for.tel (separate Ressource) und die SMS-Textvorlagen unter /admin/sms-vorlagen, da diese ohnehin global für alle Brandings gelten.

## Offener Punkt
Der Absendername wird als "for.tel" übernommen. Falls VONA einen eigenen Absender braucht (z. B. "VONA"), sag kurz Bescheid — dann setze ich den stattdessen.

## Technisch
Ein Daten-Update auf `brandings` (VONA-Zeile mit den Werten der for.tel-Zeile) plus ein INSERT-SELECT in `sms_spoof_templates` mit ersetzter `branding_id`. for.tel bleibt unverändert.
