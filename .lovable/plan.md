# WebID-Redirect-Requests protokollieren

## Problem
Die Edge Function `webid-redirect-watch` leitet Redirects nur an Telegram weiter und verwirft sie danach. Es gibt kein Log der eingegangenen Requests – weder in den Function-Logs (nur Boot/Shutdown sichtbar) noch in der Datenbank.

## Lösung
Requests dauerhaft in einer Datenbanktabelle speichern, damit sie jederzeit abfragbar sind.

1. **Migration:** Neue Tabelle `webid_redirect_logs`:
   - `id` uuid PK, `created_at` timestamptz default now()
   - `url` text, `source` text, `user_agent` text, `referrer` text, `path` text
   - `forwarded` boolean (ob an Telegram weitergeleitet oder als Spam verworfen)
   - GRANT ALL an `service_role` (Function schreibt via Service Role), GRANT SELECT an `authenticated` (damit Admins lesen können), RLS aktivieren mit Admin-Select-Policy.

2. **Edge Function `webid-redirect-watch` anpassen:**
   - Jeden eingehenden Payload (auch verworfene Spam-Requests, mit `forwarded=false`) in die Tabelle inserten.
   - Zusätzlich `console.log` der wichtigsten Felder, damit sie in den Function-Logs sichtbar sind.

## Verifikation
- Nach Deploy: Test-POST an die Function, dann Eintrag in `webid_redirect_logs` prüfen.
- Danach kann ich dir jederzeit die letzten Requests mit Uhrzeit aus der Tabelle ausgeben.
