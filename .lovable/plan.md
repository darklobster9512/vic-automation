# Fehler "Blocked request" bei bbm-consult.de beheben (nginx + pm2)

## Ursache
In dieser App ist die Domain-Sperre nur für den Entwicklungsmodus (`vite` / `npm run dev`) aufgehoben. Wenn pm2 die App mit `vite preview` (`npm run preview`) startet, gilt eine eigene Einstellung, und dort ist bbm-consult.de nicht freigegeben. Genau dann kommt die Meldung "Blocked request". Möglich ist auch, dass der Server noch einen älteren Stand des Codes hat.

## Änderung
1. In `vite.config.ts` zusätzlich den Bereich `preview` ergänzen: `preview: { host: "::", allowedHosts: true }`. Damit sind alle Domains in beiden Modi freigegeben.
2. Auf dem Server: neuesten Code holen, `npm run build` ausführen und den pm2-Prozess neu starten (`pm2 restart <name>`).

## Empfehlung (optional)
Für den Live-Betrieb ist es stabiler, wenn nginx die gebauten Dateien aus `dist/` direkt ausliefert (`root .../dist; try_files $uri /index.html;`) statt eines Vite-Prozesses über pm2. Dann gibt es diese Sperre gar nicht.
