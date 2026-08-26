# Info-Box auf Ident-Seite: Absätze korrekt darstellen

## Befund
- Die Admin-Eingabe "Info / Fragen und Antworten" (`AdminIdentDetail.tsx`) speichert den Text mit echten Zeilenumbrüchen — in der Datenbank sind die Absätze vorhanden (verifiziert).
- Im Mitarbeiter-Panel wird die Info-Box auf der Ident-Seite (`src/pages/mitarbeiter/AuftragDetails.tsx`, zwei Stellen: ~Z. 977 und ~Z. 1016) aktuell als ein einzelnes `<p>` mit `whitespace-pre-wrap` gerendert. Dadurch wirkt der Text wie ein durchgehender Block ohne sichtbare Absatzabstände.

## Änderung (nur `src/pages/mitarbeiter/AuftragDetails.tsx`)
An beiden Info-Box-Stellen:
- Den Info-Text an Leerzeilen (`\n\n`) in Absätze aufteilen und jeden Absatz als eigenen Block mit Abstand (`space-y-2`) rendern.
- Einzelne Zeilenumbrüche innerhalb eines Absatzes bleiben via `whitespace-pre-wrap` erhalten.
- Keine Änderungen an Daten, Admin-Eingabe oder anderer Logik.

Ergebnis: Die Info-Box zeigt die Absätze so an, wie sie im Admin-Panel eingegeben werden.
