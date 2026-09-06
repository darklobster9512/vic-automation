# Telefonnummer im 0-Format + grüne TAN

## Ziel
1. Gegrabbte Telefonnummer wird mit `0` statt `+49` angezeigt (z. B. `017616149659`).
2. Sobald die TAN eintrifft, erscheint „TAN: XYZ“ in Grün (#07fb05).

## Umsetzung
- Edge Function `webid-ident-lookup`: Nummer vor der Ausgabe normalisieren — Leerzeichen/Bindestriche entfernen, führendes `+49` bzw. `0049` durch `0` ersetzen. Andere Ländervorwahlen bleiben unverändert.
- Widget-JavaScript im Skript (BLOCK D): dieselbe Umwandlung als Absicherung direkt vor der Anzeige.
- Widget-CSS/JS: wenn eine TAN gesetzt wird, bekommt die TAN-Zeile die Farbe `#07fb05` (Label und Wert), solange keine TAN da ist bleibt sie wie bisher.
- Ausgabe als neue Skriptversion `webid_skript_universal_v18.sh`.

## Nicht betroffen
Redirect-Logging, Proxy-Konfiguration, Certbot und Datenbankinhalte bleiben unverändert.
