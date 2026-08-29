# Fix: Redirect-Reporter erreicht die Edge Function nicht

## Diagnose (bestätigt)

Edge-Function-Logs von `webid-redirect-watch` zeigen im relevanten Zeitraum **nur Boot/Shutdown, keine einzige Anfrage**. Der Client feuert also nichts ab, obwohl der Interceptor korrekt injiziert wird.

Ursache im v8-JS-Block:

1. `navigator.sendBeacon(E, new Blob([p], {type:'application/json'}))` — `application/json` ist **kein CORS-safelisted Content-Type**. Der Browser müsste einen Preflight schicken, was `sendBeacon` nicht kann. Ergebnis: `sendBeacon` gibt still `false` zurück, es geht nichts raus.
2. Der Code prüft den Rückgabewert nicht und nutzt den `fetch`-Fallback deshalb nie.

Deshalb landet weder `window.open` noch `link_click` in der Function.

## Fix (minimal, nur der Reporter)

In v9 ändern wir ausschließlich die Transportzeile innerhalb der `r(...)`-Funktion:

- Blob-Type auf `text/plain;charset=UTF-8` setzen → einfacher Request, kein Preflight, `sendBeacon` geht durch.
- Rückgabewert von `sendBeacon` prüfen; bei `false` (oder wenn API fehlt) auf `fetch(..., {method:'POST', body:p, keepalive:true, mode:'no-cors'})` ohne expliziten JSON-Header zurückfallen.

Die Edge Function ruft `req.json()` auf dem Body auf — das parst den JSON-Text unabhängig vom Content-Type-Header, also keine Änderung an der Function nötig.

Alle anderen v8-Bestandteile (Nginx-Config, sub_filter, Overlay, Header, UA, window.open/click/auxclick/submit/meta-refresh Hooks) bleiben **byte-identisch**.

## Deliverable

`webid_skript_universal_v9.sh` unter `/mnt/documents/`, ausführbar mit `sudo bash webid_skript_universal_v9.sh`.

Verifikation nach Deployment:
- Button mit `target="_blank"` klicken
- In den Logs von `webid-redirect-watch` muss ein Eintrag mit `source: "link_click"` bzw. `"window_open"` erscheinen
