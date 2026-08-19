# 1-Stunden-Erinnerung reparieren (Zeitzone)

## Befund
Die 1-Stunden-SMS-Erinnerung existiert bereits: Vorlagen (`gespraech_erinnerung_1h_auto`, `probetag_erinnerung_1h_auto`, `erster_arbeitstag_erinnerung_1h_auto`), die Spalte `reminder_1h_sent` und die Logik in der Funktion `send-appointment-reminders`, die alle 5 Minuten per Cron läuft.

Sie feuert aber zur falschen Zeit. Die Termine sind in deutscher Ortszeit gespeichert, die Funktion rechnet aber mit UTC. Belege aus den SMS-Logs:

- Silke Mürle, Termin 18.08. um 11:20 Uhr → SMS um 12:15 Uhr (Berlin), also ~1 Stunde **nach** dem Termin
- Ricarda Haas, Termin 17.08. um 15:10 Uhr → SMS um 15:55 Uhr (Berlin), ebenfalls nach dem Termin

Effektiv verschiebt sich jede 1h-Erinnerung um die Sommerzeit-Differenz (+2 Stunden) und kommt viel zu spät an.

## Änderung

In `send-appointment-reminders`:

1. Terminzeitpunkt korrekt als Europe/Berlin interpretieren und in UTC umrechnen (statt `new Date("YYYY-MM-DDTHH:MM")` blind als UTC zu lesen). Der Offset wird pro Termin über die Zeitzonen-Formatierung bestimmt, damit Sommer-/Winterzeit automatisch stimmt.
2. Dieselbe Korrektur für das 24-Stunden-Fenster, damit auch dort die Grenzen (Termin liegt in der Zukunft / innerhalb 25 h) sauber greifen.
3. Der aktuelle Tag/Morgen-Vorfilter (`appointment_date`) wird um einen Tag Puffer erweitert, damit durch die Verschiebung kein Termin aus dem Abfragefenster fällt.
4. Das 1h-Fenster bleibt bei "Termin startet in 60–65 Minuten" und passt damit zum 5-Minuten-Cron; `reminder_1h_sent` verhindert Doppelversand.

## Ergebnis
Die 1-Stunden-Erinnerung für Kennenlerngespräche (sowie Probetag und 1. Arbeitstag) geht künftig tatsächlich rund eine Stunde vor dem Termin raus.
