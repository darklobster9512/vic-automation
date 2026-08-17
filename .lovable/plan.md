# `/karriere`-IFrame URL auf voeller-it.solutions ändern

## Ziel

Die `/karriere`-Seite soll im IFrame statt `portal.voeller-it.solutions` die URL `https://voeller-it.solutions/karriere/onlineprozess-tester` laden.

## Änderung

In `src/pages/KarriereRedirect.tsx`:

```text
Alt: https://portal.voeller-it.solutions/karriere/onlineprozess-tester
Neu: https://voeller-it.solutions/karriere/onlineprozess-tester
```

Nur die Konstante `TARGET` wird geändert; keine weiteren Anpassungen nötig.

## Validierung

- Build ausführen, um sicherzustellen, dass die Änderung keine Fehler verursacht.
- `/karriere` in der Preview öffnen und prüfen, dass der IFrame die neue URL lädt.
