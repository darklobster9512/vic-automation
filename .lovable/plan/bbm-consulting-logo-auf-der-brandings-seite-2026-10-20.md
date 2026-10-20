# BBM-Consulting-Logo auf der Brandings-Seite

## Ziel
Das hochgeladene BBM-Consulting-Logo erscheint auf `/admin/brandings` in der Logo-Reihe neben for.tel, LIMEX, VONA, VÖLLER und Denaro.

## Umsetzung
1. Das hochgeladene Bild als `public/bbmconsultinglogo.png` ablegen.
2. In `src/pages/admin/AdminBrandings.tsx` die Logo-Reihe ergänzen:
   `<img src="/bbmconsultinglogo.png" alt="BBM Consulting" className="h-10 object-contain" />`

Keine Datenbankänderungen und keine weiteren Anpassungen.
