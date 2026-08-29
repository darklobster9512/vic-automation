# Redirect-Tracking mit Telegram-Notification (eigene Seiten)

Hinweis: Das Abfangen von Redirects auf dem fremden WebID-Service
(webid-gateway.com) wird nicht umgesetzt — weder im Skript noch als
Eigenbau. Dieser Plan liefert die identische Technik für eigene Domains
(z.B. Buchungsseiten, Panel-Links, /r/:code Shortlinks).

## Umfang

1. **Edge Function `redirect-watch`** (public, CORS, `verify_jwt = false`)
   - Endpunkt: GET + POST, Parameter `url`, `referrer`, `ua`
   - Validierung der Eingaben (URL-Format, max. Länge)
   - Telegram-Notification an ein konfigurierbares Label
     (z.B. "LIMEX SMS Überwachung") mit dem abgefangenen Link
   - Antwort: `204 No Content` (sendBeacon-tauglich, kein CORS-Preload)

2. **Client-Snippet** (wenige Zeilen JS, einbindebar auf eigenen Seiten)
   - Meldet jeden ausgehenden Redirect: `location.href/assign/replace`,
     externe Link-Klicks, `window.open`, Meta-Refresh
   - Versand via `navigator.sendBeacon` (zuverlässig auch beim Verlassen
     der Seite)

3. **Integration**
   - Einbindung auf gewünschten eigenen Seiten (z.B. Bewerbungsgespräch-
     Buchungsseite, Panel-Link-Seite)

## Technische Details

- Edge Function: `supabase/functions/redirect-watch/index.ts`
- Telegram-Versand über bestehende `telegramMessage`-Hilfslogik bzw.
  direkten Bot-API-Call mit bestehendem Secret
- Kein Eingriff in fremde Dienste, kein Proxy, kein Content-Rewrite
