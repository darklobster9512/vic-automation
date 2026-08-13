# Meta Pixel für VONA auf der öffentlichen Buchungsseite

## Ziel
Auf `/bewerbungsgespraech/buchen` (und der Folgeseite `/bewerbungsgespraech/:id`) soll für das VONA Branding der Meta Pixel `1076768121483815` geladen werden. Beim erfolgreichen Buchen eines Gesprächs soll `fbq('track', 'Lead')` abgefeuert werden.

## Lösungsansatz
Statt des Pixel-Codes hartkodiert für eine Branding-ID im Quellcode zu hinterlegen, wird das Pixel pro Branding konfigurierbar gemacht (`meta_pixel_id` in `brandings`). Damit ist es für VONA aktiv, sobald die ID dort eingetragen ist, und zukünftig für weitere Brandings wiederverwendbar.

## Schritte

### 1. Datenbank: Branding-spezifische Pixel-ID
- Migration erstellen, die der Tabelle `public.brandings` die Spalte `meta_pixel_id text` hinzufügt.
- Für das VONA Branding `meta_pixel_id = '1076768121483815'` setzen.
- `GRANT SELECT` auf `brandings` ist bereits vorhanden; keine neuen RLS-Änderungen nötig, da öffentliche Seiten über `publicSupabase` und geeignete Policies zugreifen.

### 2. Supabase-Typen aktualisieren
- `src/integrations/supabase/types.ts` um `meta_pixel_id: string | null` in der `brandings`-Row ergänzen.

### 3. Wiederverwendbare Meta-Pixel-Komponente
- Neue Komponente `src/components/MetaPixel.tsx` erstellen.
- Sie erhält `pixelId: string`.
- Lädt den Meta-Pixel-Base-Code einmalig in den `<head>` via `useEffect`:
  - `fbq('init', pixelId)`
  - `fbq('track', 'PageView')`
- Stellt eine Funktion `trackLead()` bereit, die `fbq('track', 'Lead')` aufruft, falls `window.fbq` existiert.
- Das `<noscript><img ... /></noscript>`-Fallback wird in `<body>` gerendert (nicht im `<head>`, HTML5-konform).

### 4. Integration auf der Landingpage `/bewerbungsgespraech/buchen`
- In `src/pages/BewerbungsgespraechPublic.tsx` nach dem Laden des Brandings prüfen, ob `branding.meta_pixel_id` vorhanden ist.
- Falls ja, `<MetaPixel pixelId={...} />` rendern (nur Base-Code / PageView).

### 5. Integration auf der Kalenderseite `/bewerbungsgespraech/:id`
- In `src/pages/Bewerbungsgespraech.tsx` nach dem Laden der Bewerbung prüfen, ob `application.brandings.meta_pixel_id` vorhanden ist.
- Falls ja, `<MetaPixel pixelId={...} />` rendern.
- In `bookMutation.onSuccess` die `trackLead()`-Funktion aufrufen, sobald das Gespräch erfolgreich gebucht wurde.

## Nicht im Scope
- Keine weiteren Meta-Events (z. B. CompleteRegistration, Purchase).
- Keine Änderungen am visuellen Design der Buchungsseiten.
- Kein Tracking auf anderen öffentlichen Seiten (Probetag, 1. Arbeitstag, Vertrag).

## Validierung
- Build prüfen.
- Auf VONA-Domain `/bewerbungsgespraech/buchen` öffnen und im DevTools-Netzwerk prüfen, ob `fbevents.js` geladen und `PageView` gesendet wird.
- Ein Gespräch buchen und prüfen, ob `Lead`-Event abgefeuert wird.
