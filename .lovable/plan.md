# 404 auf /buchen und /bewerbungsgespraech/buchen (voeller-it.solutions)

## Befund

Im Code sind beide Routen vorhanden (`src/App.tsx`, öffentlicher Routen-Block):

```text
/bewerbungsgespraech/buchen  -> BewerbungsgespraechPublic
/buchen                      -> BewerbungsgespraechPublic
```

Im Lovable-Preview laden beide Seiten. Das Projekt ist in Lovable **nicht published** — `https://voeller-it.solutions/` wird laut deiner Angabe über ein eigenes/externes Hosting ausgeliefert.

Ein „404 Not Found" auf einer Unterseite, während die Startseite lädt, ist typischerweise **kein React-Router-Problem**, sondern eines von zwei Dingen auf dem eigenen Server:

1. **Kein SPA-Fallback**: Der Webserver sucht eine echte Datei `/buchen` und liefert 404, statt `index.html` auszuliefern. Dann sind auch `/karriere`, `/r/<code>`, `/arbeitsvertrag/<id>` betroffen.
2. **Veralteter Build**: Auf dem Server liegt ein älterer Build, in dem die Route `/buchen` noch nicht existierte. Dann würde allerdings die React-404-Seite („Oops! Page not found") erscheinen, nicht ein Server-404.

Unterscheidungsmerkmal: Server-404 = schlichte Fehlerseite des Webservers. App-404 = unsere Seite mit „404 / Oops! Page not found".

## Vorgehen

### Schritt 1: Ursache eindeutig bestimmen
Prüfen, was der Server bei `https://voeller-it.solutions/buchen` tatsächlich zurückgibt (HTTP-Status und Content-Type). Zusätzlich `/karriere` testen:
- Beide 404 → fehlender SPA-Fallback (Fall 1).
- Nur `/buchen` betroffen, `/bewerbungsgespraech/buchen` funktioniert → veralteter Build (Fall 2).

### Schritt 2a: SPA-Fallback auf dem eigenen Server einrichten
Diese Konfiguration muss auf dem Server gemacht werden (nicht im Lovable-Projekt änderbar). Je nach Webserver:

Nginx:
```text
location / {
  try_files $uri $uri/ /index.html;
}
```

Apache (`.htaccess` im Web-Root):
```text
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /index.html [L]
```

Caddy:
```text
try_files {path} /index.html
```

### Schritt 2b: Aktuellen Build deployen
Falls es am Build liegt: neuen Production-Build erzeugen und den kompletten Inhalt von `dist/` auf den Server hochladen (alte Dateien ersetzen), Browser-Cache/CDN-Cache leeren.

### Schritt 3: Verifikation
`/buchen` und `/bewerbungsgespraech/buchen` direkt aufrufen und per Reload prüfen. Zusätzlich sicherstellen, dass die Domain-Erkennung greift (Branding Völler IT wird über `domain` bzw. `additional_domains` aufgelöst).

## Änderungen im Projekt-Code

Vorerst **keine**. Die Routen sind korrekt definiert; die Ursache liegt in der Auslieferung.

Nur falls du den Server-Fallback nicht konfigurieren kannst, gibt es eine Code-Alternative: Umstellung auf `HashRouter` (URLs würden dann `…/#/buchen` lauten). Das ist ein spürbarer Eingriff (alle bestehenden Links, SMS-Shortlinks und E-Mail-Links müssten angepasst werden) und sollte nur der letzte Ausweg sein.

## Nicht im Scope
- Keine Änderungen an Inhalten der Buchungsseite.
- Keine Änderungen an Branding-, SMS- oder E-Mail-Logik.
