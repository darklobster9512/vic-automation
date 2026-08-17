# Warum `/buchen` nur über voeller-it.net funktioniert

## Messung gegen die Origin-IP (17.08.2026, 13:35 UTC)

Ja, beide Domains landen auf derselben IP `132.243.174.25`. Genau deshalb ist der folgende Test aussagekräftig — es wurde direkt gegen diese Origin gefragt, nur mit unterschiedlichem Host-Header:

```text
curl -sk --resolve <host>:443:132.243.174.25 https://<host>/buchen

voeller-it.net              200  -> /@vite/client
nichtexistent.example.com   200  -> /@vite/client
voeller-it.solutions        200  -> assets/index-D7yY3ama.js
www.voeller-it.solutions    200  -> assets/index-D7yY3ama.js
```

Der entscheidende Punkt ist die dritte Zeile im Test: Ein frei erfundener Hostname bekommt **dieselbe** Antwort wie `voeller-it.net`.

Daraus folgt:

- Für `voeller-it.net` existiert auf dem Server **kein eigener server-Block**. Die Anfrage fällt in den `default_server`, und dieser proxied auf einen laufenden Vite-Dev-Server. Deshalb ist dort immer der aktuelle Code inklusive `/buchen` sichtbar.
- Für `voeller-it.solutions` und `www.voeller-it.solutions` **gibt es** einen eigenen server-Block, und der liefert ein statisches Verzeichnis aus, dessen `index.html` weiterhin `index-D7yY3ama.js` referenziert. Dieses Bundle enthält `/buchen` und `/bewerbungsgespraech/buchen` nicht.

Die Configs wirken identisch, weil der Unterschied nicht im sichtbaren `.solutions`-File liegt, sondern darin, dass `.net` gar nicht davon bedient wird.

## Vorgehen auf dem Server

### 1. Effektive Config auslesen
```bash
nginx -T | grep -nE 'server_name|root |proxy_pass|default_server'
```
Erwartung: ein Block mit `default_server` + `proxy_pass` (Vite), ein Block mit `server_name voeller-it.solutions www.voeller-it.solutions` + `root`.

### 2. Das `root` des `.solutions`-Blocks prüfen
```bash
grep -o 'assets/index-[^"]*\.js' <root>/index.html
```
Steht dort `index-D7yY3ama.js`, ist der neue Build nie in diesem Verzeichnis angekommen (falsches Zielverzeichnis, Release-Symlink nicht umgehängt, anderes Volume/Container).

### 3. Korrigieren — eine der beiden Varianten
- **A (empfohlen, dauerhaft):** Den `.solutions`-Block auf dieselbe Quelle zeigen lassen wie der Default-Block (gleicher `proxy_pass` bzw. gleiches `root`). Dann können beide Domains nie wieder auseinanderlaufen.
- **B:** Den kompletten neuen `dist/`-Inhalt inklusive `index.html` in genau dieses `root` deployen, Symlink umhängen, `nginx -s reload`, danach Cloudflare-Cache für `index.html` purgen.

### 4. Verifikation
```bash
curl -sk --resolve voeller-it.solutions:443:132.243.174.25 \
  https://voeller-it.solutions/buchen | grep -o 'assets/index-[^"]*\.js'
```
Der Bundle-Name muss sich geändert haben; danach `/buchen` und `/bewerbungsgespraech/buchen` öffnen — es muss „Kennenlerngespräch buchen“ erscheinen.

## Änderungen im Projekt-Code

Keine. `src/App.tsx` enthält beide Routen bereits korrekt.
