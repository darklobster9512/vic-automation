# Fix: Certbot bricht wegen `header_filter_by_lua_block` ab

## Ursache

Certbot liest die Nginx-Konfiguration mit seinem eigenen Parser (`nginxparser`). Dieser Parser kennt die Direktive `header_filter_by_lua_block` nicht und ignoriert deshalb die komplette Datei `/etc/nginx/sites-enabled/webid.limex.solutions`. Folgen:

- Certbot kann das Zertifikat nicht mehr sauber verlängern/verwalten.
- Häufige Begleiterscheinung: das `lua-nginx-module` (`libnginx-mod-http-lua`) ist gar nicht geladen — dann scheitert zusätzlich `nginx -t` bzw. der nginx-Start, was den vorherigen Error 520 erklärt.

## Plan

### 1. Diagnose auf dem VPS (User führt aus, Ausgabe posten)

```bash
nginx -t
systemctl status nginx --no-pager | head -20
nginx -V 2>&1 | tr ' ' '\n' | grep -i lua
dpkg -l | grep -E 'libnginx-mod-http-lua|nginx-extras'
tail -n 40 /var/log/nginx/error.log
```

Damit ist eindeutig geklärt: (a) läuft nginx überhaupt, (b) ist das Lua-Modul geladen, (c) was genau Certbot stört.

### 2. Lua-Modul sicher laden

- Debian Bookworm: `libnginx-mod-http-lua` installieren (bereits im v12-Skript enthalten).
- In `/etc/nginx/nginx.conf` ganz oben (vor `events {}` bzw. im Hauptkontext) sicherstellen:
  ```nginx
  load_module modules/ngx_http_lua_module.so;
  ```
  (`libnginx-mod-http-lua` legt normalerweise automatisch eine Datei in `/etc/nginx/modules-enabled/` an — prüfen mit `ls /etc/nginx/modules-enabled/`.)
- Danach `nginx -t` muss grün sein, dann `systemctl reload nginx`.

### 3. Certbot-Konflikt entschärfen (Zertifikatsverlängerung zukunftssicher machen)

Certbot mit nginx-Plugin kommt mit Lua-Blöcken nicht klar. Zwei Optionen:

- **Option A (empfohlen): webroot-Verlängerung.** Einmalig ein Verzeichnis `/var/www/certbot` anlegen, in der Server-Config einen `location /.well-known/acme-challenge/`-Block ergänzen, und Verlängerung auf `--webroot` umstellen. Certbot muss die Nginx-Datei dann nie wieder parsen/anfassen → die Warnung verschwindet dauerhaft, Auto-Renewal funktioniert.
- **Option B: Manueller Reload-Hook.** Certbot läuft weiter, installiert das Zertifikat aber nicht selbst in Nginx; stattdessen `--deploy-hook "systemctl reload nginx"`. Weniger sauber als A.

Gewählt: Option A.

### 4. Verifizierung

```bash
nginx -t && systemctl reload nginx
curl -sI https://web-id.limex.solutions/ | head -5          # 200, kein 520
certbot renew --dry-run                                      # muss ohne nginxparser-Warnung durchlaufen
curl -s https://web-id.limex.solutions/ | grep -c sim-header # >= 1 (Subfilter lebt)
```

## Technische Details

- Es wird **keine** bestehende Funktionalität angefasst: Subfilter, Header-Bar, Logo, Redirect-Tracking (Lua + Edge Function `webid-redirect-watch`) bleiben identisch.
- Änderungen beschränken sich auf: Module-Load-Zeile in `nginx.conf`, ACME-Challenge-Location + webroot-Verzeichnis, Umstellung des Certbot-Renewal auf webroot.
- Ergebnis wird als aktualisiertes Skript `webid_skript_universal_v14.sh` geliefert (auf Basis von v13), plus kurze Befehlsliste für den laufenden Server, falls du nicht neu ausrollen willst.

## Hinweis zur vorherigen Session (Error 520)

Der 520 kam höchstwahrscheinlich genau daher: Certbot hat die Site-Datei wegen der Lua-Direktive ignoriert, und/oder nginx lief nicht, weil das Lua-Modul fehlte. Schritt 1 bestätigt das, bevor geändert wird.
