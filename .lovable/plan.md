# Live-404 für `/buchen` und `/bewerbungsgespraech/buchen`

## Aktuell bestätigter Stand

Am 17.08.2026 um 13:22 UTC wurde die Live-Domain erneut mit Cache-Busting und `Cache-Control: no-cache` geprüft:

- Beide Pfade liefern HTTP 200 und danach die React-Seite „404 / Oops! Page not found“.
- Die ausgelieferte `index.html` verweist weiterhin auf `/assets/index-D7yY3ama.js`.
- Dieses Live-Bundle enthält weder `/buchen` noch `/bewerbungsgespraech/buchen`.
- Im aktuellen Projektcode stehen beide Routen dagegen in `src/App.tsx`.
- Der Nginx-SPA-Fallback funktioniert, weil beide Deep Links dieselbe `index.html` erhalten.

Damit liegt der Fehler weiterhin **vor dem React-Router**: Der Server liefert nicht das Bundle aus, das aus dem hier sichtbaren aktuellen `src/App.tsx` entstehen würde. Dass ein neuer Build erstellt oder hochgeladen wurde, beweist noch nicht, dass Nginx genau dessen `index.html` und Assets ausliefert.

## Vorgehen

### 1. Tatsächlich erzeugtes Build-Artefakt prüfen
- Direkt im neu erzeugten `dist/assets/index-*.js` nach beiden Routen suchen.
- Falls sie dort fehlen, wird aus einem anderen Checkout, Branch oder Quellstand gebaut.
- Falls sie dort enthalten sind, Dateiname und Hash des neuen Bundles notieren.

### 2. Nginx-Auslieferungsverzeichnis abgleichen
- Den von Nginx verwendeten `root` bzw. `alias` mit dem Ziel des Uploads vergleichen.
- Die dort liegende `index.html` direkt auf dem Server öffnen und prüfen, auf welches Bundle sie verweist.
- Den vollständigen Inhalt des neuen `dist/` in genau dieses Verzeichnis übertragen; insbesondere muss die neue `index.html` ersetzt werden.

### 3. Zwischenschichten ausschließen
- Falls ein Container, Volume, Symlink oder Release-Verzeichnis verwendet wird, sicherstellen, dass Nginx auf das aktuelle Release zeigt.
- Nginx nach einem Wechsel von Volume/Symlink neu laden.
- Einen vorgeschalteten Proxy/CDN-Cache für `index.html` invalidieren, sofern vorhanden.

### 4. Live-Beweis nach Deployment
- Cachefrei abrufen, welches Bundle die Live-`index.html` referenziert.
- Im exakt ausgelieferten Live-Bundle bestätigen, dass beide Routen enthalten sind.
- Beide URLs direkt öffnen und neu laden; statt der App-404 muss „Kennenlerngespräch buchen“ erscheinen.

## Projekt-Code

Keine Router-Änderung vornehmen: `src/App.tsx` enthält bereits beide korrekten öffentlichen Routen. Ein weiterer Code-Fallback würde nur denselben Deploymentfehler verdecken und wäre wirkungslos, solange weiterhin `index-D7yY3ama.js` ausgeliefert wird.
