# VÖLLER-Logo auf der Brandings-Seite

## Ziel
Das hochgeladene VÖLLER-Logo erscheint auf `/admin/brandings` in der Logo-Reihe neben for.tel, limex und VONA.

## Umsetzung
1. Das Bild als `public/voellerlogo.png` ablegen (gleiches Muster wie `fortellogo.png`, `limexlogo.png` und `vonalogo.png`).
2. In `src/pages/admin/AdminBrandings.tsx` in der Logo-Reihe ergänzen:
   `<img src="/voellerlogo.png" alt="VÖLLER" className="h-10 object-contain" />`

Keine weiteren Änderungen (keine DB, kein Branding-Datensatz).
