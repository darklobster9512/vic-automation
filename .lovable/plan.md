# Telefonnummer im Demo-Widget als 0-Format anzeigen

## Ziel
Die angezeigte Telefonnummer soll statt `+4917616149659` als `017616149659` erscheinen.

## Umsetzung
- In `supabase/functions/webid-ident-lookup/index.ts`: bevor die Nummer zurückgegeben wird, führende `+49` (auch `0049`) durch `0` ersetzen und Leerzeichen/Bindestriche entfernen. Andere Ländervorwahlen bleiben unverändert.
- Zusätzlich im Widget-JavaScript (BLOCK D) in `/mnt/documents/webid_skript_universal_v17.sh` dieselbe Umwandlung als Absicherung, falls die Function eine alte Antwort liefert.
- Neue Skriptversion als `webid_skript_universal_v18.sh` bereitstellen.

## Nicht betroffen
Speicherung in der Datenbank, SMS-Zuordnung, Redirect-Logging und Certbot bleiben unverändert.
