# Buchungslinks (1. Arbeitstag, Bewerbungsgespräch) wieder funktionsfähig machen

## Befund (geprüft)
- Alle öffentlichen Seiten ohne Login (`/erster-arbeitstag/:id`, `/bewerbungsgespraech/:id`, `/bewerbungsgespraech/buchen`, `/buchen`, `/probetag/:id`, Kurzlinks `/r/:code`) nutzen eine eigene, sitzungsfreie Verbindung.
- Diese Verbindung zeigt noch fest auf die **gelöschte Datenbank** (`gzgfyuftjvezqjkosntu`). Die Adresse antwortet nicht mehr, darum bleibt die Seite leer bzw. zeigt „Link ungültig".
- Die aktuelle Datenbank (`dgkailowvrbugapykyan`) ist für Besucher ohne Login korrekt freigegeben: Bewerbungen, Verträge, Zeitpläne und Kurzlinks sind lesbar (Testabruf erfolgreich).
- Zwei weitere Stellen rufen Funktionen direkt über die alte Adresse auf:
  - Mitarbeiter-Konto anlegen im Admin (`AdminMitarbeiterDetail.tsx`)
  - Vertrag unterschreiben im Mitarbeiter-Panel (`ContractSigningView.tsx`)

## Änderungen
1. `src/integrations/supabase/publicClient.ts`: Adresse und öffentlichen Schlüssel aus den Projekt-Umgebungswerten (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`) lesen statt fest einzutragen. Weiterhin ohne Sitzung/Speicherung. Damit bricht das bei einem künftigen Datenbankwechsel nicht erneut.
2. Die zwei festen Funktionsaufrufe ebenfalls auf `VITE_SUPABASE_URL` umstellen.
3. Abschließende Suche, dass keine Stelle im Code mehr die alte Adresse enthält.

## Unverändert
- Keine Änderungen an Datenbank, Texten, E-Mails oder SMS. Bereits verschickte Links bleiben gültig, da sie auf die App-Seiten zeigen, nicht auf die Datenbank.

## Test
- `/erster-arbeitstag/<Vertrags-ID>` und `/bewerbungsgespraech/<Bewerbungs-ID>` im Browser ohne Login öffnen: Logo, Name und Kalender müssen erscheinen.
- Einen vorhandenen Kurzlink `/r/<code>` öffnen: Weiterleitung muss funktionieren.
- Nach Freigabe App neu veröffentlichen, damit die Live-Links den Fix bekommen.
