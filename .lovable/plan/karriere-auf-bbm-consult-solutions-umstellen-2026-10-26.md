# /karriere auf bbm-consult.solutions umstellen

Die Karriere-Seite zeigt im Rahmen zurzeit `https://bbm-consult.de/karriere/onlineprozess-tester`. Seit bbm-consult.de auf das Portal zeigt, würde sie sich damit selbst laden.

## Änderung
- Die Adresse im Rahmen wird zu `https://bbm-consult.solutions/karriere/onlineprozess-tester`. Nur die Domain ändert sich, der Pfad bleibt gleich.

## Technische Details
- `src/pages/KarriereRedirect.tsx`: Konstante `TARGET` anpassen.
- Auf dem Server neu bauen bzw. den pm2-Prozess auf 8081 neu starten, damit die Änderung live geht.
