# bbm-consult.de zeigt die falsche Seite

## Ursache
Dieses Projekt erlaubt in seinen Einstellungen schon jede Domain (`allowedHosts: true`). Die Meldung "Blocked request ... bbm-consult.de" kann also nicht von diesem Projekt kommen. Sie kommt von einem **anderen** Vite-Prozess. Das heißt: Die Anfrage an bbm-consult.de landet gar nicht in deinem nginx-Block mit dem richtigen Port, sondern in einem anderen Block (meist dem Standard-Block oder dem einer anderen Domain).

Typische Gründe dafür:
- Der Block greift nur für HTTP (Port 80), aber du rufst https auf. Der Block für 443 fehlt oder zeigt auf einen anderen Port.
- `server_name` passt nicht genau (zum Beispiel fehlt `www.bbm-consult.de` oder es gibt einen Tippfehler).
- Die Datei liegt nur in `sites-available` und ist nicht in `sites-enabled` verlinkt, oder nginx wurde danach nicht neu geladen.
- Ein anderer Block hat dieselbe Domain oder ist `default_server`.
- Der pm2-Prozess auf dem Port ist gar nicht dieses Projekt (falscher Ordner), oder der Server hat noch einen alten Stand.

## Prüfschritte auf dem Server
1. `sudo nginx -T | grep -n "bbm-consult\|listen\|proxy_pass"`: Zeigt, welche Blöcke die Domain enthalten und auf welche Ports sie zeigen, für 80 **und** 443.
2. `pm2 list` und `pm2 describe <name>`: Prüfen, ob der Prozess auf diesem Port im Ordner dieses Projekts läuft.
3. `curl -I -H "Host: bbm-consult.de" http://127.0.0.1:<port>`: Kommt hier die richtige App, liegt der Fehler in nginx.
4. Fehler beheben (443-Block ergänzen oder `server_name` korrigieren), dann `sudo nginx -t && sudo systemctl reload nginx`.

## In dieser App
Es ist keine Änderung am Code nötig. Wenn du mir die Ausgabe von Schritt 1 schickst, sage ich dir genau, welche Zeile falsch ist.
