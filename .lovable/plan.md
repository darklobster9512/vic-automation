# Fehler "Blocked request" bei bbm-consult.de beheben

## Ursache
Diese App erlaubt bereits alle Domains. Die Meldung kommt also nicht von hier, sondern von der Website **bbm-consult.de** selbst, also dem Projekt "BBN Consulting Website". Die Karriere-Seite zeigt diese Website im Rahmen an. Dort wird die Domain gerade von einer Entwicklungs-Vorschau statt von der veröffentlichten Version beantwortet, und diese Vorschau sperrt fremde Domains.

## Lösung (im Projekt "BBN Consulting Website")
1. Dort in den Einstellungen `server.allowedHosts: true` eintragen, damit bbm-consult.de nicht mehr gesperrt wird.
2. Das Projekt veröffentlichen und prüfen, dass bbm-consult.de auf die veröffentlichte Version zeigt (Domains-Seite: Status "Active").
3. Danach /karriere hier noch einmal öffnen und prüfen, ob die Seite angezeigt wird.

## In dieser App
Hier ändert sich nichts. Die Karriere-Seite zeigt weiterhin bbm-consult.de/karriere/onlineprozess-tester an.
