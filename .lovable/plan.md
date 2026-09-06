# Leads-TXT überarbeiten: nur Vor- und Nachname, ungültige Nummern raus

## Änderungen am Export

1. **Nur Vor- und Nachname**: Aus `full_name` nur das erste Wort (Vorname) und das letzte Wort (Nachname) übernehmen — Zwischennamen fliegen raus (z. B. "Lisa Rios Jimenez" → "Lisa Jimenez").
2. **Ein-Wort-Namen entfernen**: Einträge ohne erkennbaren Nachnamen (z. B. "Meltem", "TiRo176") fallen weg, weil der Mass-Import-Parser zwingend Vor- und Nachname verlangt.
3. **Ungültige Telefonnummern entfernen**: Alles, was nicht auf eine gültige Nummer normalisiert werden kann (zu kurz, nur Nullen, Fake-Nummern wie 123456789), fliegt komplett raus.

## Ausgabe

- Gleiche Datei überschreiben: `leads_mass_import.txt`, Format pro Zeile weiterhin:
  `Vorname Nachname email@domain.de +49…`
- Abschließend melden, wie viele Zeilen übrig sind und welche Einträge entfernt wurden.

## Technisch

Reiner Datenexport per Skript — keine Projekt- oder Datenbankänderung.
