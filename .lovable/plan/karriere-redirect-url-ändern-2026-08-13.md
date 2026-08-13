# Karriere-Redirect URL ändern

## Ziel
Den `/karriere`-IFrame-Redirect von for.tel auf VONA umstellen.

## Aktueller Stand
- `src/pages/KarriereRedirect.tsx` leitet aktuell auf `https://for-tel.solutions/karriere/onlineprozess-tests` weiter.
- Route `/karriere` ist in `src/App.tsx` registriert.

## Änderung
In `src/pages/KarriereRedirect.tsx`:
- `TARGET` ändern zu `https://vona-cloud.solutions/karriere/onlineprozess-tester`.

## Validierung
- Build ausführen, um sicherzustellen dass die Änderung keine Fehler verursacht.