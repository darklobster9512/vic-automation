# Leads-Export: Vorname Nachname E-Mail Telefonnummer

## Was in der Datei steckt (geprüft)

- Die CSV ist **UTF-16 kodiert und Tab-getrennt** (kein Komma) — deshalb sieht sie in Excel/Editor oft "kaputt" aus.
- **352 Datensätze**, Spalten `full_name`, `email`, `phone_number` sind vollständig vorhanden.
- Die Telefonnummern stehen mit Präfix `p:` davor, z. B. `p:+4917661278396`.
- Zu den "komischen Zeichen": Die Namen sind tatsächlich **korrekt kodiert**, es gibt kein Mojibake (kein `Ã¤`, `Ã¶` o. ä.). Verwendet werden:
  - `ä` (U+00E4), `ö` (U+00F6), `ü` (U+00FC), `Ö` (U+00D6), `ß` (U+00DF)
  - zusätzlich ungarisch/portugiesische Akzente: `á` (U+00E1), `ó` (U+00F3)
  
  Die Zeichen wirken nur "komisch", weil die Datei UTF-16 ist und viele Programme sie als UTF-8/ANSI öffnen.

## Vorgehen

1. CSV als UTF-16 / Tab-getrennt einlesen.
2. Je Zeile ausgeben: `full_name email telefonnummer`, Präfix `p:` entfernt, Nummern im `+49…`-Format.
3. Umlaute bleiben korrekt erhalten; Ausgabe als **UTF-8 .txt**.
4. Ergebnis als Download-Datei bereitstellen (`limex_leads_kontakte.txt`).

## Technisch

- Reines Datenexport-Skript, keine Änderung am Projektcode und keine Datenbankänderung.
