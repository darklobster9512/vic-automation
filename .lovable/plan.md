## Änderung

In `src/pages/mitarbeiter/MitarbeiterDashboard.tsx` wird die Statistik-Kachel „Stundenlohn" entfernt.

Aktuell wird an zweiter Stelle der Statistik-Reihe je nach Branding entweder „Stundenlohn", „Festgehalt" oder „Guthaben" angezeigt. Künftig entfällt der Stundenlohn-Fall: Bei Brandings mit Stundenlohn-Abrechnung wird an dieser Stelle keine Kachel mehr gerendert, das Raster zeigt dann drei Kacheln (Zugewiesene Tests, Offene Aufträge, Bewertung).

„Festgehalt" und „Guthaben" bleiben für alle anderen Brandings unverändert.

## Technisch

- Im `stats`-Array den `isHourlyRate`-Zweig entfernen und den Eintrag herausfiltern, sodass keine leere Karte entsteht.
- Kein Ersatz-Inhalt, keine weiteren Änderungen an Layout, Datenabfragen oder anderen Seiten.
