# Leads für Mass-Import formatieren

## Was in der Datei steckt (geprüft)

- `inded_Leads_2026-08-23_2026-09-05.csv`: **UTF-16, Tab-getrennt**, 228 Datensätze.
- Spalten `full_name`, `email`, `phone_number` vollständig befüllt (keine leeren E-Mails).
- Telefonnummern mit Präfix `p:`, z. B. `p:+4917645753605`.

## Ziel

Eine TXT-Datei, die 1:1 ins Mass-Import-Textfeld bei `/admin/bewerbungen` (Externe Bewerbung + Mass Import) eingefügt werden kann. Eine Zeile pro Lead im Format:

```text
Vorname Nachname email@domain.de +49176...
```

## Vorgehen

1. CSV als UTF-16 / Tab-getrennt einlesen.
2. Pro Zeile ausgeben: `full_name email telefonnummer` — `p:`-Präfix entfernt, Nummer bereits im `+49…`-Format.
3. Namen normalisieren (nie komplett Großbuchstaben; jedes Wort mit großem Anfangsbuchstaben), damit der Zeilen-Parser sauber greift.
4. Ausgabe als UTF-8 `.txt` (`leads_mass_import.txt`), Download bereitstellen.
5. Kontrolle: Anzahl Zeilen = 228, Stichprobe gegen Originaldaten.

## Technisch

Reiner Datenexport per Skript — keine Projekt- oder Datenbankänderung.
