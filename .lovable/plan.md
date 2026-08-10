# VONA-Logo auf der Brandings-Seite

## Ziel
Das hochgeladene VONA-Logo erscheint auf `/admin/brandings` in der Logo-Reihe neben for.tel und limex.

## Umsetzung
1. Das Bild als `public/vonalogo.png` ablegen (gleiches Muster wie `fortellogo.png` und `limexlogo.png`).
2. In `src/pages/admin/AdminBrandings.tsx` in der Logo-Reihe ergänzen:
   `<img src="/vonalogo.png" alt="VONA" className="h-10 object-contain" />`

Keine weiteren Änderungen (keine DB, kein Branding-Datensatz).
