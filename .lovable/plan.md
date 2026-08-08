# Identlink im Mitarbeiter-Panel anklickbar machen

## Ziel
Der bei den Ident-Daten hinterlegte Wert des Feldes "Identlink" (bzw. jeder Wert, der eine URL ist) soll im Mitarbeiter-Bereich als Link dargestellt und beim Klick in einem neuen Tab geöffnet werden.

## Umsetzung
- In `src/pages/mitarbeiter/AuftragDetails.tsx` wird die Anzeige der Ident-Daten-Kacheln (`testDataWithValues`) angepasst:
  - Ist der Wert eine URL (beginnt mit `http://`/`https://`, oder Feldname enthält "link" und der Wert sieht nach einer Domain aus), wird statt reinem Text ein Anchor gerendert.
  - Anchor mit `target="_blank"` und `rel="noopener noreferrer"`, unterstrichen in Primärfarbe, mit kleinem "Öffnen"-Icon (`ExternalLink`).
  - Werte ohne `http` werden beim Öffnen automatisch mit `https://` ergänzt.
  - Lange Links brechen sauber um (`break-all`), Kopieren per Markieren bleibt möglich.
- Alle anderen Felder (Identcode, Passwort etc.) bleiben unverändert als Monospace-Text.

## Technische Details
- Kleine Hilfsfunktion `toExternalUrl(value)` lokal in der Datei; keine Datenbank- oder Backend-Änderungen nötig.
- Keine Änderung an der Admin-Seite `/admin/idents/:id` (Eingabefeld bleibt wie es ist).
