# Verdienst auf 0 setzen (außer Starterjobs)

## Ziel
Bei allen Aufträgen über alle Brandings hinweg soll die Prämie auf 0 gesetzt werden. Starterjobs bleiben unverändert.

## Ist-Zustand (geprüft)
- 744 Aufträge sind keine Starterjobs, davon haben 156 aktuell eine Prämie ungleich 0.
- 10 Starterjobs existieren; diese haben ohnehin bereits keine Prämie und werden nicht angefasst.

## Änderung
Ein einmaliges Daten-Update auf der Tabelle `orders`:
- Setze `reward = '0'` für alle Aufträge mit `is_starter_job = false`.
- Starterjobs (`is_starter_job = true`) bleiben unverändert.

Keine Code- oder UI-Änderungen nötig: Die Mitarbeiter-Auftragskarten blenden die Prämienzeile bei Werten wie "0" bereits aus.

## Hinweis
Die alten Prämienwerte sind nach dem Update nicht mehr gespeichert und lassen sich nicht automatisch wiederherstellen.
