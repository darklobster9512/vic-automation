# v12: lua-resty-http ersetzen (Paket existiert nicht in Debian Bookworm)

## Fehler

```
E: Unable to locate package lua-resty-http
```

`lua-resty-http` ist in den Debian-Bookworm-Repos nicht vorhanden (nur via luarocks/manuell). `set -e` bricht das Skript an dieser Stelle ab.

## Fix: curl statt lua-resty-http im Lua-Code

Der Lua-Block braucht keine HTTP-Library — im `ngx.timer.at`-Kontext ist `os.execute` erlaubt (asynchron, blockiert die User-Response nicht). Wir rufen dort einfach `curl` auf (ist auf dem VPS schon installiert).

### 1. Paketliste ändern

Aus:
```
libnginx-mod-http-lua lua-resty-http lua-cjson
```
wird:
```
libnginx-mod-http-lua lua-cjson
```
(`lua-cjson` existiert in Bookworm und bleibt für das JSON-Encoding.)

### 2. header_filter_by_lua_block ersetzen

Statt `require "resty.http"`:

```lua
header_filter_by_lua_block {
  local status = ngx.status
  local loc = ngx.header["Location"]
  if loc and status >= 300 and status < 400 then
    local from = ngx.var.scheme .. "://" .. ngx.var.host .. ngx.var.request_uri
    local ua  = ngx.var.http_user_agent or ""
    local body = require("cjson").encode({
      source = "nginx-header-filter",
      status = status,
      from   = from,
      to     = loc,
      ua     = ua,
      ts     = ngx.time()
    })
    local f = io.open("/tmp/webid_redirect_payload.json", "w")
    if f then f:write(body) f:close() end
    ngx.timer.at(0, function()
      os.execute("curl -s -m 5 -X POST -H 'Content-Type: text/plain;charset=UTF-8' --data-binary @/tmp/webid_redirect_payload.json https://laozvnaupdecerpvwzmh.supabase.co/functions/v1/webid-redirect-watch >/dev/null 2>&1 &")
    end)
  end
}
```

Hinweis: Gleichzeitige Redirects könnten sich die Payload-Datei überschreiben — für unser Monitoring-Aufkommen akzeptabel; alternativ Dateiname mit `ngx.now()` suffixen (mache ich in v12 so: `/tmp/webid_rp_<pid>_<time>.json`).

### 3. Weitere Anpassungen aus dem vorherigen Plan bleiben

- `apt update && apt upgrade -y` → nur `apt update` (verhindert openssh-Restart → PuTTY-Abbruch).
- `ufw allow 22/tcp` vor `ufw enable`.
- Skript als Datei in `/root/webid_v12.sh` via nano einfügen, `bash -n` prüfen, in `screen -S webid` laufen lassen; Reconnect mit `screen -d -r webid`.
- Alte hängende screen-Sessions vorher killen (`screen -X -S <id> quit`).

## Ergebnis

`/mnt/documents/webid_skript_universal_v12.sh`: v11 mit curl-basiertem Lua-Tracking (ohne lua-resty-http), ohne apt upgrade, mit explizitem SSH-Firewall-Allow. Der Rest (Client-JS, Subfilter, Certbot, TLS) bleibt byte-identisch.
