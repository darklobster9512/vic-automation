# `/karriere`-IFrame URL auf denaro-consult.solutions ändern

## Ziel

Die `/karriere`-Seite lädt im IFrame statt der Völler-URL die neue Denaro-URL.

## Änderung

In `src/pages/KarriereRedirect.tsx`:

```text
Alt: https://voeller-it.solutions/karriere/onlineprozess-tester
Neu: https://denaro-consult.solutions/karriere/onlineprozess-tester
```

Nur die Konstante `TARGET` wird geändert; keine weiteren Anpassungen nötig.

## Validierung

- Build ausführen, um sicherzustellen, dass die Änderung keine Fehler verursacht.
- `/karriere` in der Preview öffnen und prüfen, dass der IFrame die neue URL lädt.
