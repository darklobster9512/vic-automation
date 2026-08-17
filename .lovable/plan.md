# Warum `/buchen` nur über voeller-it.net funktioniert

## Gemessener Stand (17.08.2026, 13:3x UTC)

Du hast recht: Hinter Cloudflare landet auch `voeller-it.net` auf **derselben Origin-IP** `132.243.174.25`. Trotzdem liefert derselbe nginx je nach Host-Header zwei völlig verschiedene Anwendungen aus. Direkt gegen die Origin getestet (`curl --resolve <host>:443:132.243.174.25`):

```text
Host: voeller-it.net          -> 200, HTML enthält /@vite/client   (Vite-DEV-Server, Live-Code)
Host: www.voeller-it.net      -> 200, HTML enthält /@vite/client
Host: voeller-it.solutions    -> 200, HTML enthält assets/index-D7yY3ama.js  (statischer ALTER Build)
```

Daraus folgt eindeutig:

- Es gibt **zwei getrennte nginx-server-Blöcke** auf derselben Maschine.
- Der `.net`-Block **proxied auf einen laufenden Vite-Dev-Server** — deshalb ist dort immer der aktuelle Code inklusive `/buchen` und `/bewerbungsgespraech/buchen` vorhanden.
- Der `.solutions`-Block liefert ein **statisches `dist/`-Verzeichnis**, dessen `index.html` weiterhin auf `index-D7yY3ama.js` zeigt. Dieses Bundle enthält beide Routen nicht, deshalb der React-404.

Der neue Build ist also nicht in dem Verzeichnis gelandet, aus dem der `.solutions`-server-Block ausliefert. Es ist kein Router-, kein SPA-Fallback- und kein Cloudflare-Problem.

## Vorgehen auf dem Server

### 1. Beide server-Blöcke gegenüberstellen
- `nginx -T` ausgeben und die Blöcke für `server_name voeller-it.net` und `server_name voeller-it.solutions` vergleichen.
- Notieren: der eine hat `proxy_pass` auf den Dev-Server-Port, der andere ein `root`-Verzeichnis.

### 2. Das `root`-Verzeichnis des `.solutions`-Blocks prüfen
- Dort `index.html` öffnen und den referenzierten Bundle-Namen ablesen.
- Steht dort `index-D7yY3ama.js`, wurde das neue `dist/` woandershin kopiert (falsches Zielverzeichnis, anderes Release-Verzeichnis, Symlink nicht umgehängt, anderer Container/Volume).

### 3. Deployment korrigieren
- Aktuellen Stand bauen und im Build selbst verifizieren, dass beide Routen im `dist/assets/index-*.js` vorkommen.
- Den **kompletten** `dist/`-Inhalt inklusive `index.html` in exakt dieses `root` übertragen.
- Bei Symlink-/Release-Struktur den Symlink umhängen und nginx neu laden.
- Anschließend den Cloudflare-Cache für `index.html` purgen.

### 4. Alternative: beide Domains gleich behandeln
Wenn `.solutions` dieselbe Anwendung wie `.net` zeigen soll, kann der `.solutions`-Block einfach denselben `proxy_pass` bzw. dasselbe `root` verwenden wie der `.net`-Block. Dann kann der Build für `.solutions` nie wieder auseinanderlaufen.

### 5. Verifikation
```text
curl -sk --resolve voeller-it.solutions:443:132.243.174.25 https://voeller-it.solutions/buchen | grep -o 'assets/index-[^"]*\.js'
```
Der Bundle-Name muss dem neuen Build entsprechen; danach `/buchen` und `/bewerbungsgespraech/buchen` im Browser öffnen — es muss „Kennenlerngespräch buchen“ erscheinen.

## Änderungen im Projekt-Code

Keine. `src/App.tsx` enthält beide Routen bereits korrekt; eine Code-Änderung würde die falsche Auslieferung nur verdecken.
