# Karriere-Redirect auf VÖLLER-Portal umstellen

## Ziel
Die `/karriere`-Seite soll statt `vona-cloud.solutions` das VÖLLER-Portal `portal.voeller-it.solutions` im iframe laden, mit identischem Pfad.

## Umsetzung
1. In `src/pages/KarriereRedirect.tsx` die Konstante `TARGET` ändern:
   - Alt: `https://vona-cloud.solutions/karriere/onlineprozess-tester`
   - Neu: `https://portal.voeller-it.solutions/karriere/onlineprozess-tester`

Keine weiteren Änderungen nötig.
