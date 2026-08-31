# 30x-Redirects serverseitig in Nginx abfangen (Lua)

Ziel: Alle HTTP 30x-Antworten des Upstreams (die der Browser als reine Redirects sieht und die dein injiziertes JS nie zu sehen bekommt) direkt in Nginx abfangen und an die bestehende Edge Function `webid-redirect-watch` melden.

## Was neu ist

Aktuell fängt v10 nur clientseitige Navigationen (JS, Klicks, Meta-Refresh, History-API). Server-Redirects laufen als `302/301/303/307/308` zwischen Browser und Nginx ab, bevor irgendein HTML/JS geladen wird — dein Skript sieht sie nicht.

Mit Lua im `header_filter`-Phase liest Nginx bei jeder Antwort den Upstream-`Location`-Header aus. Ist er gesetzt und der Status 3xx, wird asynchron (via `ngx.timer.at`, damit die Response nicht blockiert) ein POST an die Edge Function abgesetzt.

## Umsetzung

Neues Skript `webid_skript_universal_v11.sh` auf Basis von v10, unverändert bis auf:

1. **Paketinstallation ergänzen:** `libnginx-mod-http-lua` zusätzlich zu `nginx-extras`.
2. **Im `http {}`-Block** (via `nginx.conf`-Patch oder `sites-available/…`):
   - `resolver 1.1.1.1 8.8.8.8 ipv6=off valid=60s;` (für Lua-HTTP zur Supabase-Domain)
   - `lua_package_path` bleibt Default
3. **Im `server {}`-Block** ein `header_filter_by_lua_block`:
   ```
   header_filter_by_lua_block {
     local status = ngx.status
     local loc = ngx.header["Location"]
     if loc and status >= 300 and status < 400 then
       local from = ngx.var.scheme .. "://" .. ngx.var.host .. ngx.var.request_uri
       local ua  = ngx.var.http_user_agent or ""
       ngx.timer.at(0, function(_, from_url, to_url, st, uagent)
         local http = require "resty.http"
         local httpc = http.new()
         httpc:set_timeout(3000)
         httpc:request_uri("https://laozvnaupdecerpvwzmh.supabase.co/functions/v1/webid-redirect-watch", {
           method = "POST",
           headers = { ["Content-Type"] = "text/plain;charset=UTF-8" },
           body = require("cjson").encode({
             source = "nginx-header-filter",
             status = st,
             from   = from_url,
             to     = to_url,
             ua     = uagent,
             ts     = ngx.time()
           }),
           keepalive_timeout = 0,
         })
       end, from, loc, status, ua)
     end
   }
   ```
4. **`lua-resty-http`** wird benötigt — via `apt install lua-resty-http` (oder `luarocks install lua-resty-http`, fällt-back auf manuelles `/etc/nginx/lua/`-Verzeichnis + `lua_package_path`). Skript prüft Verfügbarkeit und installiert entsprechend.
5. Alles andere aus v10 (sub_filter-Injektion, Client-JS, TLS, CORS) bleibt byte-identisch.

## Edge-Function-Seite

`webid-redirect-watch` akzeptiert schon `text/plain` JSON aus dem Client. Der neue serverseitige Payload nutzt das gleiche Format plus `source: "nginx-header-filter"`, damit du in den Logs unterscheiden kannst, ob ein Redirect vom Browser-JS oder direkt vom Nginx gemeldet wurde. Keine Function-Änderung nötig.

## Verifikation nach Deploy

```bash
sudo bash webid_skript_universal_v11.sh
sudo nginx -t && sudo systemctl reload nginx

# 30x provozieren (z.B. eine bekannte Redirect-URL des Upstreams aufrufen)
curl -sI https://web-id.limex.solutions/<pfad-der-redirected>
# → Erwartung: Edge-Function-Logs zeigen einen POST mit source=nginx-header-filter
```

## Risiken / Hinweise

- `header_filter_by_lua_block` darf **keine** blockierenden Calls machen — deshalb `ngx.timer.at(0, ...)` für den HTTP-Call.
- Wenn Supabase-DNS/TLS mal langsam ist, timeoutet der Timer nach 3s ohne Impact auf die User-Response.
- Doppelmeldungen möglich, wenn der Browser dem Redirect folgt und die Ziel-URL zusätzlich per Client-JS als „navigation“ meldet — in der Edge Function ggf. anhand `source` deduplizieren.
