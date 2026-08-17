# Fehlende Buchungsrouten im Production-Build von voeller-it.solutions

## Bestätigter Befund

Im Code sind beide Routen vorhanden (`src/App.tsx`, öffentlicher Routen-Block):

```text
/bewerbungsgespraech/buchen  -> BewerbungsgespraechPublic
/buchen                      -> BewerbungsgespraechPublic
```

Die Live-Domain wurde direkt geprüft:

- `https://voeller-it.solutions/buchen` liefert HTTP 200 und anschließend die React-Seite „404 / Oops! Page not found“.
- `https://voeller-it.solutions/bewerbungsgespraech/buchen` verhält sich identisch.
- Nginx liefert für beide URLs korrekt dieselbe `index.html` aus. Der SPA-Fallback funktioniert also.
- Das aktuell ausgelieferte Bundle `/assets/index-D7yY3ama.js` enthält weder `/buchen` noch `/bewerbungsgespraech/buchen`.
- Im aktuellen Projektcode stehen beide Routen dagegen ausdrücklich in `src/App.tsx`.

Damit ist die Ursache bestätigt: **Auf `voeller-it.solutions` liegt nicht derselbe Frontend-Build wie in der Lovable-Preview.** Andere aktuelle Änderungen können durchaus enthalten sein; konkret die beiden Buchungsrouten fehlen aber im ausgelieferten Bundle.

## Vorgehen

### 1. Deployment-Quelle korrigieren
Sicherstellen, dass der externe Deployment-Prozess genau den aktuellen Projektstand baut, in dem `src/App.tsx` beide öffentlichen Routen enthält. Insbesondere prüfen, ob der Server aus einem älteren Git-Stand, einem anderen Branch oder einem zwischengespeicherten Build-Artefakt deployed.

### 2. Frontend vollständig neu bauen und ausliefern
- Production-Build aus dem aktuellen Stand erzeugen.
- Den vollständigen Inhalt von `dist/` atomar auf `voeller-it.solutions` ersetzen; nicht nur einzelne Assets kopieren.
- Alte gehashte Assets dürfen bleiben, aber `index.html` muss auf das neue Bundle zeigen.
- Falls vor Nginx ein CDN oder Deployment-Cache sitzt, `index.html` invalidieren.

### 3. Live verifizieren
- Im neuen ausgelieferten JavaScript-Bundle prüfen, dass beide Routen enthalten sind.
- `/buchen` und `/bewerbungsgespraech/buchen` direkt öffnen und neu laden.
- Prüfen, dass statt der App-404 der Intro-Step „Kennenlerngespräch buchen“ erscheint und das Völler-Branding aufgelöst wird.

## Änderungen im Projekt-Code

**Keine Änderung am Router nötig.** Der aktuelle Projektcode ist korrekt. Er muss lediglich tatsächlich auf den externen Server deployed werden.

## Nicht im Scope
- Keine Änderungen an Inhalten der Buchungsseite.
- Keine Änderungen an Branding-, SMS- oder E-Mail-Logik.
- Keine Änderung von `BrowserRouter` oder der Nginx-SPA-Konfiguration.
