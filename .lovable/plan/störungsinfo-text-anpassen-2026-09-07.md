# Störungsinfo-Text anpassen

## Ziel
Die Texte im "Störungs-Info senden"-Dialog sollen von "technische Probleme" / "aus Sicherheitsgründen" auf "Wartungsarbeiten" / "neue Sicherheitsupdates" umgestellt werden.

## Änderungen

### 1. E-Mail-Text in `src/components/admin/DomainAnnouncementDialog.tsx`
Aktuell:
```
wir hatten heute Morgen technische Probleme und mussten aus Sicherheitsgründen alle Passwörter zurücksetzen.
```
Neu:
```
wir hatten heute Morgen Wartungsarbeiten und neue Sicherheitsupdates durchgeführt und mussten daher alle Passwörter zurücksetzen.
```

### 2. SMS-Default-Text in derselben Datei
Aktuell:
```
Hallo {vorname}, wir hatten heute Morgen technische Probleme. Dein neues Passwort: {passwort}. ...
```
Neu:
```
Hallo {vorname}, wir hatten heute Morgen Wartungsarbeiten und neue Sicherheitsupdates durchgeführt. Dein neues Passwort: {passwort}. ...
```

## Nicht im Scope
- Der UI-Button-Tooltip "Störungs-Info senden" in `AdminBrandings.tsx` bleibt unverändert.
- Das separate E-Mail-Template "Website wieder erreichbar" (`AdminEmails.tsx`) mit dem Titel "Technische Störung behoben" wird nicht angefasst, da es ein eigenständiges Template ist.

## Validierung
- TypeScript-Check (`npx tsgo --noEmit`) ausführen.
- Keine weiteren Vorkommen der alten Formulierung im Projekt prüfen.
