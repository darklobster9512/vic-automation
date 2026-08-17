# Warum `/buchen` nur auf voeller-it.net funktioniert

## Gemessener Stand (17.08.2026, 13:3x UTC)

Die beiden Domains zeigen **nicht** auf denselben Endpoint:

```text
voeller-it.net              -> 188.114.96.0 / 2a06:98c1:31xx::  (Cloudflare, Server: cloudflare)
voeller-it.solutions        -> 132.243.174.25                   (Server: nginx/1.22.1)
www.voeller-it.solutions    -> 132.243.174.25
portal.voeller-it.solutions -> 132.243.174.25
```

- `https://voeller-it.net/buchen` liefert HTML mit `/@vite/client` und `/@react-refresh` — das ist die **Lovable-Umgebung mit dem aktuellen Code**, kein statischer Build. Deshalb sind dort beide Routen sofort vorhanden.
- `https://voeller-it.solutions/buchen` liefert HTTP 200 vom eigenen nginx, dessen `index.html` weiterhin auf `assets/index-D7yY3ama.js` verweist. Dieses Bundle enthält `/buchen` und `/bewerbungsgespraech/buchen` nicht, deshalb greift der React-404.

Fazit: Es ist kein Routing-, Nginx- oder Codeproblem. Der eigene Server liefert nach wie vor das alte Bundle aus — der neue Build ist dort nicht wirksam geworden.

## Vorgehen

### 1. Auf dem Server prüfen, was nginx wirklich ausliefert
- Aus der aktiven nginx-Config den `root`/`alias` für voeller-it.solutions ermitteln.
- In diesem Verzeichnis die `index.html` öffnen und den Bundle-Namen ablesen.
- Solange dort `index-D7yY3ama.js` steht, wurde das neue `dist/` nicht an diese Stelle geschrieben (falsches Zielverzeichnis, anderes Release/Symlink, anderer Container oder anderes Volume).

### 2. Build-Artefakt gegenprüfen
- Im frisch erzeugten `dist/assets/index-*.js` nach beiden Routen suchen.
- Fehlen sie dort, wird aus einem anderen Branch/Checkout gebaut.

### 3. Vollständig deployen
- Kompletten Inhalt von `dist/` (inklusive `index.html`) in genau das nginx-Root übertragen, nicht nur einzelne Assets.
- Bei Symlink-/Release-Struktur den Symlink umhängen und nginx neu laden.
- Cloudflare/Proxy-Cache für `index.html` invalidieren, falls vorgeschaltet.

### 4. Alternative ohne eigenen Server
- Wenn `voeller-it.net` bereits über Lovable läuft, kann `voeller-it.solutions` (plus `www`) genauso als Custom Domain in Lovable verbunden werden. Dann entfällt das manuelle Deployment und beide Domains sind automatisch synchron.

## Änderungen im Projekt-Code

Keine. `src/App.tsx` enthält beide Routen bereits korrekt; jede weitere Code-Änderung würde das Deployment-Problem nur verdecken.
