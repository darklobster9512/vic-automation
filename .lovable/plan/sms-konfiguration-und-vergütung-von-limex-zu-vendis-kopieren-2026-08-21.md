# SMS-Konfiguration und Vergütung von LIMEX zu Vendis kopieren

## Ausgangslage
- LIMEX Solutions GmbH: Absendername "limex", Seven.io-Key, Elitegateway-Key, SMSBot-Key (keine Rental-ID), 2 SMS-Spoof-Vorlagen. Vergütung: Festgehalt, Minijob 520 €, Teilzeit 1.500 €, Vollzeit 3.000 €, Stundenlohn aktiv mit 29 €/h, geschätzte Gehälter 603 / 2.500 / 3.000 €.
- Vendis Development Services GmbH: keine SMS-Konfiguration, Vergütungsmodell "pro Auftrag", keine Gehaltsangaben.

## Was passiert
1. SMS-Konfiguration von LIMEX auf Vendis übertragen: Absendername, Seven.io-Key, Elitegateway-Key, SMSBot-Key + Rental-ID, Ident-SMS-Einstellung.
2. Vergütung übertragen: Zahlungsmodell (Festgehalt), Gehälter Minijob/Teilzeit/Vollzeit, Stundenlohn-Option inkl. Sätze, geschätzte Gehälter.
3. Die 2 SMS-Spoof-Vorlagen als neue Einträge für Vendis anlegen.

Nicht kopiert: Telefonnummern, Aufträge, Vertragsvorlagen, globale SMS-Textvorlagen.

## Offener Punkt
Der Absendername wird als "limex" übernommen. Falls Vendis einen eigenen Absender braucht (z. B. "Vendis"), sag Bescheid.

## Technisch
Ein UPDATE auf `brandings` (Vendis-Zeile mit den LIMEX-Werten) plus INSERT-SELECT in `sms_spoof_templates` mit ersetzter `branding_id`. LIMEX bleibt unverändert, keine Code-Änderung.
