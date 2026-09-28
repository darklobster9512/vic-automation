# Backup-Wiederherstellung reparieren

## Problem
Beim Einspielen der ZIP scheitert jede Tabelle mit „cannot call json_populate_recordset on a scalar". Die Backup-Datei selbst ist in Ordnung – der Fehler liegt in der Wiederherstellungs-Funktion: Die Zeilen werden doppelt verpackt verschickt, sodass die Datenbank statt einer Liste nur einen einzelnen Text sieht.

## Lösung
- In der Funktion `admin-backup` (Aktion „import") die Daten als reinen Text übergeben und erst in der Datenbank in eine Liste umwandeln (`$1::text::json` statt `$1::json`). Damit wird nichts mehr doppelt verpackt.
- Zusätzlich absichern: Falls trotzdem ein einzelner Text ankommt, wird er vor dem Einfügen einmal ausgepackt.
- Funktion neu veröffentlichen und mit einer kleinen Test-Tabelle prüfen (z. B. `brandings` mit 1 Zeile, Modus „Ergänzen").

## Danach
Du startest die Wiederherstellung erneut mit derselben ZIP. Bereits vorhandene Zeilen werden bei „Ergänzen" übersprungen, es werden keine E-Mails oder SMS verschickt.

## Hinweis
`auth.identities` (Login-Daten) lässt sich nur einspielen, wenn vorher `auth.users` erfolgreich eingespielt wurde – die Reihenfolge prüfe ich beim Test mit.
