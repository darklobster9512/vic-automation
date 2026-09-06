# v17 Widget-Feinschliff

Änderungen ausschließlich in `/mnt/documents/webid_skript_universal_v17.sh`, in BLOCK A (CSS) und BLOCK D (Widget-JS). Nginx-Konfig, Zertifikate, Reporter und andere Blöcke bleiben unverändert.

## Was sich ändert

1. **Widget-Header** (`#sim-widget .sw-h`)
   - Hintergrundfarbe von `#111` auf `#05b1fb`.
   - Text „Demo Daten“ → „Verwende folgende Demo Daten“.

2. **TAN-Zeile mit Reload-Timer**
   - In der TAN-Box erscheint rechts ein kleiner Countdown (`3s … 0s`), der bei jedem 3-Sekunden-Polling zurückgesetzt wird.
   - Layout: `TAN: <wert>` links, `<countdown>` rechts, per Flex.
   - Sobald die TAN geladen ist, verschwindet der Timer (Polling stoppt sowieso).

3. **Logo unten rechts** (`#sim-badge`)
   - Breite von `150px` auf `240px` erhöht, für mobile Viewports (`max-width:600px`) auf `160px` reduziert, damit es nicht überlagert.

## Technisch

- BLOCK A: Header-Regel auf `#05b1fb` setzen, `.sw-tan` als Flex-Container (`display:flex;justify-content:space-between;align-items:center`), neue Klasse `.sw-timer` (kleine, halbtransparente Schrift). Mobile Media-Query um `#sim-badge` und ggf. Timer-Größe erweitern.
- BLOCK D: Widget-HTML anpassen (neuer Header-Text, `<span id="sw-timer">3s</span>` in der TAN-Box). Im Polling-Loop `setInterval` alle 1s den Countdown von 3 herunterzählen, bei jedem `poll()`-Start auf 3 zurücksetzen. Wenn `d.tan` da ist, Timer-Span leeren.
- Keine weiteren Bereiche des Skripts anfassen.
