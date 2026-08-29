# Fix v6: Popup, Headbar, Logo, Redirect wieder aktivieren

## Diagnose

v6 hat die Injection wegen des 4096-Zeichen-Limits in drei `sub_filter`-Blöcke aufgeteilt. Dabei sind **zwei `sub_filter "</body>"`-Direktiven mit identischem Suchmuster** entstanden (Block 2 = Redirect-Reporter, Block 3 = Simulations-Overlay).

Nginx dedupliziert `sub_filter`-Einträge intern über den Suchstring. Bei zwei identischen Mustern greift effektiv nur eine Regel — die andere wird verworfen. Ergebnis in v6:

- Block 1 (`<head>` → CSS) läuft → nur `sub_filter`-Textersetzungen sichtbar
- Block 2 + Block 3 kollidieren am `</body>` → mindestens einer der beiden JS-Blöcke fehlt komplett
- Ohne JS-Injection kein `sim-header`, kein `sim-badge`, kein `sim-popup`, kein Redirect-Report

## Fix (v7)

Auf **unterschiedliche Anker** verteilen, damit keine zwei `sub_filter` denselben Suchstring haben. Alle Blöcke bleiben unter 4096 Zeichen.

- Block A: `sub_filter "<head>"` → CSS **+ Redirect-Reporter** (der Reporter soll ohnehin so früh wie möglich hooken — ideal, bevor Seiten-JS `location.assign` etc. cached; Reporter läuft auch ohne `document.body`).
- Block B: `sub_filter "</body>"` → Simulations-Overlay (braucht `document.body`, gehört ans Ende).

Grober Größen-Check:
- CSS (~600) + Redirect-JS (~2100) ≈ 2700 Zeichen < 4096 ✓
- Overlay-JS (~1500) < 4096 ✓

Alles andere aus v6 bleibt **byte-identisch**: Proxy-Header, User-Agent-Passthrough, WebSocket-Map, alle vorhandenen Text-`sub_filter`s, TLS/Certbot-Teil, `nginx -t && systemctl restart nginx`.

## Deliverable

Neue Datei `/mnt/documents/webid_skript_universal_v7.sh` (überschreibt nichts). Ausführung wie gehabt: `sudo bash webid_skript_universal_v7.sh`. Verifikation:

```bash
curl -s https://web-id.limex.solutions/ | grep -c "sim-header"     # >= 1
curl -s https://web-id.limex.solutions/ | grep -c "webid-redirect-watch"  # >= 1
```

Edge Function `webid-redirect-watch` bleibt unverändert und wird weiter genutzt.
