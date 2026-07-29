## Ziel
Auf `/admin/brandings` soll das hochgeladene **limex**-Logo neben dem bestehenden `for.tel`-Logo in der Kopfzeile erscheinen.

## Umsetzung
1. Datei `limexlogo.png` aus dem Upload nach `public/limexlogo.png` kopieren (liegt dann wie `fortellogo.png` im public-Ordner, erreichbar unter `/limexlogo.png`).
2. In `src/pages/admin/AdminBrandings.tsx` (Zeile 56) das einzelne `<img>` durch eine Flex-Zeile mit beiden Logos ersetzen:
   - `for.tel`-Logo (unverändert, `h-10`)
   - `limex`-Logo daneben, gleiche Höhe `h-10`, `object-contain`, mit passendem Abstand (`gap-6`) und vertikal zentriert
   - Alt-Texte: „for.tel" und „limex"

## Technische Details
- Kein Design-Token-Eingriff nötig, reine Layout-Änderung (`flex items-center gap-6 mb-4`).
- Logo wird bewusst nach `public/` gelegt (nicht als CDN-Asset), da das bestehende Logo dort ebenfalls liegt und per absolutem Pfad referenziert wird.
