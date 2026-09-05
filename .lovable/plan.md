# Lead-Event auf /bewerbungsgespraech/buchen verlagern

## Ist-Zustand
- Die individuelle Buchungsseite (`Bewerbungsgespraech.tsx`) feuert aktuell nach erfolgreicher Buchung `fbq("track", "Lead")` über `trackMetaLead()`.
- Die öffentliche Seite `/bewerbungsgespraech/buchen` (`BewerbungsgespraechPublic.tsx`) lädt das Meta-Pixel nur mit `PageView` — kein Lead-Event.

## Änderungen
1. **Individuelle Seite** (`src/pages/Bewerbungsgespraech.tsx`): den `trackMetaLead()`-Aufruf nach erfolgreicher Buchung entfernen (Import ggf. bereinigen). PageView-Pixel bleibt unverändert.
2. **Öffentliche Seite** (`src/pages/BewerbungsgespraechPublic.tsx`): nach erfolgreicher Terminbuchung (an der Erfolgs-Stelle) `trackMetaLead()` aus `@/components/MetaPixel` aufrufen — nur wenn das Branding `meta_pixel_enabled` und eine `meta_pixel_id` hat. Kein Event bei Blacklist-Ablehnung.

## Technisch
- `trackMetaLead()` ist defensiv (prüft `window.fbq`); der Branding-Guard dient der sauberen Trennung.
- Keine Datenbank- oder Backend-Änderungen nötig.
