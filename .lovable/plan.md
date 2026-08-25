# Benötigte Stunden bei Nicht-Starterjobs auf 0 setzen

## Ziel
Bei allen Aufträgen über alle Brandings hinweg sollen die benötigten Stunden (`estimated_hours`) auf 0 gesetzt werden. Starterjobs bleiben unverändert.

## Ist-Zustand (geprüft)
- 744 Aufträge sind keine Starterjobs; alle 744 haben aktuell einen `estimated_hours`-Wert ungleich "0".
- 10 Starterjobs existieren; diese werden nicht angefasst.

## Änderung
Ein einmaliges Daten-Update auf der Tabelle `orders`:
- Setze `estimated_hours = '0'` für alle Aufträge mit `is_starter_job = false`.
- Starterjobs (`is_starter_job = true`) bleiben unverändert.

Keine Code- oder UI-Änderungen nötig: Die Mitarbeiter-Auftragscarten blenden die Verdienstzeile bei Stundenwerten wie "0" bereits aus.

## Hinweis
Die alten Stundenwerte sind nach dem Update nicht mehr gespeichert und lassen sich nicht automatisch wiederherstellen.
