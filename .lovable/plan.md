# Demo-Daten Widget: Mobile-Optimierung

Das Widget soll auf Smartphones vollständig innerhalb des sichtbaren Bildschirms bleiben und nicht rechts abgeschnitten oder außerhalb positioniert werden.

## Änderungen im Skript `webid_skript_universal_v17.sh`

Nur BLOCK A (CSS im `<head>`) und BLOCK D (Widget vor `</html>`) werden angepasst. Alle anderen Blöcke, Redirect-Logging, Certbot und Proxy-Setup bleiben unverändert.

### CSS-Anpassungen (`#sim-widget`)
- Standardbreite bleibt 260 px auf Desktop.
- Zusätzliche Regel `max-width: calc(100vw - 20px)` damit das Widget nie breiter als der Viewport ist.
- Media Query `@media (max-width: 600px)`:
  - `width: calc(100vw - 20px)`
  - `right: 10px; left: auto; top: 60px`
  - kleinere Schrift (`font-size: 13px`) und kompakteres Padding
  - TAN-Feld `font-size: 18px`
- `touch-action: none` auf dem Header, damit Drag auf Touchgeräten nicht mit Scrollen kollidiert.

### JS-Anpassungen (Widget-Init und Drag)
- Beim Einsetzen: gespeicherte Position aus `localStorage` nur anwenden, wenn sie im aktuellen Viewport liegt; sonst verwerfen und Standardposition rechts oben verwenden.
- Nach dem Einsetzen und bei `window`-Resize/`orientationchange`: Widget-Position klemmen (`clamp`) auf `0…innerWidth-offsetWidth` und `0…innerHeight-offsetHeight`.
- Drag-Handler nutzen weiterhin Pointer Events; das bestehende Clamping bleibt.

## Technische Details
- Änderungen ausschließlich innerhalb der beiden `sub_filter`-Strings in `/etc/nginx/sites-available/$DOMAIN`.
- Keine neuen Nginx-Direktiven, keine Änderungen an Puffergrößen, kein neuer Reload-Mechanismus.
- Ausgabedatei: `/mnt/documents/webid_skript_universal_v17.sh` (überschreibt die aktuelle v17).
