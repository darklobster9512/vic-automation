# Lead-Event auf /bewerbungsgespraech/buchen

## Ist-Zustand
- Die individuelle Buchungsseite (`Bewerbungsgespraech.tsx`) feuert nach erfolgreicher Buchung bereits `fbq("track", "Lead")` über `trackMetaLead()`.
- Die öffentliche Seite `/bewerbungsgespraech/buchen` (`BewerbungsgespraechPublic.tsx`) lädt das Meta-Pixel nur mit `PageView` — ein Lead-Event wird beim Buchen nicht ausgelöst.

## Änderung
- In `src/pages/BewerbungsgespraechPublic.tsx` nach erfolgreicher Terminbuchung (gleiche Stelle wie Erfolgs-Screen/Toast) `trackMetaLead()` aus `@/components/MetaPixel` aufrufen.
- Bedingung: nur wenn das Branding `meta_pixel_enabled` und eine `meta_pixel_id` hat (analog zur bestehenden Pixel-Einbindung), damit Brandings ohne aktiviertes Pixel nichts senden.
- Kein Event bei Ablehnung durch die Blacklist-Sperre.

## Technisch
- `trackMetaLead()` ist defensiv (prüft `window.fbq`), der zusätzliche Guard auf Branding-Einstellung dient nur der sauberen Trennung.
- Keine Datenbank- oder Backend-Änderungen nötig.
