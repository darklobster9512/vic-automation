# Meta Pixel nur auf `/bewerbungsgespraech/buchen`

## Ziel
Der Meta Pixel (PageView) soll weiterhin auf `/bewerbungsgespraech/buchen` laden, aber **nicht** auf `/buchen`.

## Änderung
`src/pages/BewerbungsgespraechPublic.tsx` rendert aktuell den Pixel unabhängig vom Pfad, sobald `branding.meta_pixel_id` gesetzt ist. Stattdessen:

- Pfad über `useLocation()` auslesen.
- Pixel nur rendern, wenn der Pfad `/bewerbungsgespraech/buchen` ist:

```text
{location.pathname === "/bewerbungsgespraech/buchen" && branding?.meta_pixel_id && <MetaPixel .../>}
```

Beide Routen in `src/App.tsx` bleiben unverändert und zeigen weiterhin dieselbe Seite.

## Nicht im Scope
- Keine Änderungen am Pixel-Code selbst oder am Lead-Tracking auf der Kalenderseite `/bewerbungsgespraech/:id`.
- Keine visuellen Änderungen.

## Validierung
- `/buchen` öffnen: kein `fbevents.js` im Netzwerk.
- `/bewerbungsgespraech/buchen` öffnen: PageView wird gesendet.
