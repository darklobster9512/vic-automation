# Redirect-Interceptor in v4-Skript einbauen (nutzt bestehende `webid-redirect-watch`)

Ziel: Nur den Client-JS-Redirect-Interceptor in das funktionierende v4-Skript
einfügen. Serverseitiger `error_page`/`mirror`-Block bleibt draußen (der hatte
die letzte Version gebrochen). Endpoint ist die bereits deployte Edge Function
`webid-redirect-watch`.

## Änderung

Im Injection-`<script>`-Block (v4 Zeile 139–176), direkt **vor** der bestehenden
`inject()`-IIFE, eine zweite IIFE ergänzen. Nur einfache Anführungszeichen im
JS — konsistent mit dem v3/v4-Quote-Fix, damit der nginx-Parser sauber bleibt.

Sonst wird nichts am Skript verändert: `sub_filter`, Header, `proxy_pass`,
UA-Weitergabe, `<head>`-Injection-Punkt — alles unverändert.

## Interceptor-Umfang

Meldet jeden ausgehenden externen Redirect an
`https://laozvnaupdecerpvwzmh.supabase.co/functions/v1/webid-redirect-watch`
per `navigator.sendBeacon` (Fallback: `fetch` mit `keepalive: true, mode: 'no-cors'`).

Payload: `{ url, source, userAgent, referrer }` — passt zum bestehenden
POST-Handler der Function (siehe `supabase/functions/webid-redirect-watch/index.ts`).

Abgefangen wird:
- `window.location.href = …` (Setter-Wrap auf `Location.prototype.href`)
- `location.assign(…)` / `location.replace(…)`
- `window.open(…)`
- Klicks auf `<a href>` mit externem/Deep-Link-Ziel (Capture-Phase)
- Neu eingefügte `<meta http-equiv="refresh">` (MutationObserver)

Duplikat-Suppression: gleiche `source|url` innerhalb 3 s nur einmal.

Als "extern" gilt alles außerhalb `location.hostname`, `webid-gateway.com`,
`webid-gateway.de`.

## Deliverable nach Approval

Aktualisiertes `webid_skript_universal_v5.sh` als Chat-Ausgabe (Copy-Paste-fertig).
Keine Änderungen an Edge Function oder Repo-Dateien — die Function existiert bereits.
