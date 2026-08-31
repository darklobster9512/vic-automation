# v15: Lua entfernen und Certbot-Nginx wiederherstellen

## Ziel

Eine neue vollständige `webid_skript_universal_v15.sh`, die wieder den bisherigen Certbot-Aufruf verwendet:

```bash
certbot --nginx ... --redirect --keep-until-expiring
```

Der von Certbot nicht unterstützte `header_filter_by_lua_block` wird vollständig entfernt. SSL, automatische Verlängerung, bestehende Subfilter, Popup, Header, Logo und Client-JavaScript bleiben erhalten.

## Umsetzung

1. **Alte und doppelte Site-Konfigurationen bereinigen**
   - Sowohl `web-id.limex.solutions` als auch `webid.limex.solutions` aus `sites-enabled` und `sites-available` entfernen.
   - Dadurch parst Certbot keine liegen gebliebene zweite Datei mit altem Lua-Block mehr.

2. **Vorherigen Certbot-Ablauf wieder einsetzen**
   - Zuerst eine einfache, Lua-freie HTTP-Konfiguration aktivieren.
   - Danach das Zertifikat mit `certbot --nginx` anfordern bzw. weiterverwenden.
   - Anschließend die finale SSL-Konfiguration schreiben und mit `nginx -t` prüfen.

3. **Lua vollständig ersetzen**
   - `libnginx-mod-http-lua`, `lua-cjson` und `header_filter_by_lua_block` entfallen.
   - Nginx schreibt serverseitige 301/302/303/307/308-Antworten samt originalem Upstream-`Location`-Header in ein separates JSON-Redirect-Log.
   - Dafür werden ausschließlich normale, von Certbot unterstützte Nginx-Direktiven (`map`, `log_format`, `access_log`) verwendet.

4. **Redirects außerhalb von Nginx melden**
   - Ein kleiner systemd-Dienst verfolgt das Redirect-Log und sendet neue Einträge per `curl` an die bereits bestehende `webid-redirect-watch`-Edge-Function.
   - Der Dienst startet automatisch beim Booten neu und beeinflusst die Nginx-Antwort nicht, falls Telegram/Supabase vorübergehend nicht erreichbar ist.
   - Gemeldet werden Originalziel, Quell-URL, Status, User-Agent, Referrer und Client-IP.

5. **OPRA4X-Ziel ohne Lua behandeln**
   - Die bestehende OPRA4X-Regel wird mit einer nativen `proxy_redirect`-Regex umgesetzt.
   - Das separate Log enthält weiterhin das ursprüngliche Upstream-Ziel; erst die an den Browser ausgelieferte `Location` wird auf `https://www.deutsche-bank.de/` geändert.

6. **Sicher prüfen**
   - Shell-Syntax der fertigen Datei prüfen.
   - Im Skript vor jedem Neustart `nginx -t` ausführen.
   - Am Ende Status von Nginx und Redirect-Reporter ausgeben sowie einen `certbot renew --dry-run` durchführen.

## Ergebnis

Eine direkt ausführbare v15-Datei ohne Lua-Direktiven. Certbot kann sämtliche aktiven Nginx-Dateien wieder lesen, SSL bleibt über das Nginx-Plugin verwaltet und serverseitige Redirects werden weiterhin an die bestehende Edge Function gemeldet.
