# webid-redirect-watch: nur OPRA4X-Redirects an Telegram weiterleiten

## Ziel
Die bestehende Edge Function `webid-redirect-watch` soll nicht mehr jede gemeldete Navigation an Telegram schicken. Weitergeleitet wird nur noch, wenn die gemeldete Ziel-URL ein Deutsche-Bank-OPRA4X-Redirect ist (z. B. `https://www.deutsche-bank.de/opra4x/...`). Alle clientseitigen Events wie `page_leave`, `beforeunload`, `visibilitychange`, `history_pushState` usw. werden still verworfen.

## Umsetzung

Einzige Änderung in `supabase/functions/webid-redirect-watch/index.ts`:

1. In `handle()` direkt am Anfang eine Filter-Bedingung einbauen:
   - Weiterleitung nur, wenn `payload.url` mit `https://www.deutsche-bank.de/opra4x` beginnt (exakter Präfix inkl. Schema + Host, damit keine Fremddomains erfasst werden).
   - Zusätzlich als Sicherheitsnetz: Quellen, die eindeutig clientseitiger Spam sind (`page_leave`, `beforeunload`, `visibilitychange`, `pagehide`, `popstate`, `hashchange`, `history_pushState`, `history_replaceState`, `meta_refresh_dynamic`), werden immer verworfen, auch falls die URL zufällig passt.
2. Bei Nicht-Match: Funktion antwortet weiterhin `204 No Content` — kein Log-Spam, keine Telegram-Nachricht, keine Fehler.
3. Format der Telegram-Nachricht bleibt exakt wie im Beispiel (Ziel, Host, Quelle, Pfad, Referrer, User-Agent).

## Keine Änderungen an
- Nginx-Skript (v16 bleibt unverändert — der Reporter darf weiter alles senden).
- Client-JS-Injektion (sendet weiter, wird serverseitig gefiltert).
- Telegram-Chats / Event `webid_redirect_abgefangen`.

## Verifikation
Nach dem Deployment:
- Test-POST mit OPRA4X-URL → Telegram-Nachricht erscheint.
- Test-POST mit `source: "page_leave"` und beliebiger URL → `204`, keine Telegram-Nachricht.
