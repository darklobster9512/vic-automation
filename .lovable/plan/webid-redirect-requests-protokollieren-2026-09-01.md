# WebID-Redirect-Requests protokollieren

## Problem
Die Edge Function `webid-redirect-watch` leitet Redirects nur an Telegram weiter und verwirft sie danach. Es gibt kein Log der eingegangenen Requests – weder in den Function-Logs noch in der Datenbank.

## Lösung
**Alle** eingehenden Requests dauerhaft in einer Datenbanktabelle speichern – auch die, die nicht das OPRA4X-Format haben oder aus Spam-Quellen stammen. Telegram-Benachrichtigungen bleiben unverändert: nur OPRA4X-Redirects werden an Telegram gesendet.

1. **Migration:** Neue Tabelle `webid_redirect_logs`:
   - `id` uuid PK, `created_at` timestamptz default now()
   - `url` text, `source` text, `user_agent` text, `referrer` text, `path` text
   - `forwarded` boolean – `true` wenn an Telegram gesendet (OPRA4X), `false` wenn nur geloggt
   - GRANT ALL an `service_role` (Function schreibt via Service Role), GRANT SELECT an `authenticated`, RLS aktivieren mit Admin-Select-Policy (`has_role(auth.uid(), 'admin')`).

2. **Edge Function `webid-redirect-watch` anpassen:**
   - Jeden eingehenden Payload in die Tabelle inserten – vor der OPRA4X/Spam-Filterung.
   - `forwarded=true` setzen, wenn die Telegram-Nachricht rausgeht, sonst `false`.
   - Zusätzlich `console.log` der wichtigsten Felder für die Function-Logs.

## Verifikation
- Nach Deploy: Test-POST (einmal OPRA4X-URL, einmal andere URL) an die Function, dann beide Einträge in `webid_redirect_logs` prüfen (`forwarded` true/false).
- Danach sind die letzten Requests mit Uhrzeit jederzeit aus der Tabelle abfragbar.
