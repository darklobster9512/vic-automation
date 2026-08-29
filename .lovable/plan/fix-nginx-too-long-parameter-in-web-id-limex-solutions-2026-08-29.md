# Fix: nginx "too long parameter" in web-id.limex.solutions

## Diagnose (bestätigt)

- Die generierte Datei `/etc/nginx/sites-enabled/web-id.limex.solutions` enthält EINEN `sub_filter`-Aufruf, dessen zweiter Parameter (die komplette CSS+JS-Injection) **6510 Zeichen** lang ist.
- Nginx akzeptiert max. **4096 Zeichen** pro Token → Fehler `too long parameter, probably missing terminating '"' character` an Zeile 75 (dort beginnt der Block).
- v4 funktionierte nur, weil der Block ohne das Redirect-Script noch knapp unter 4096 Zeichen lag. Das neue Redirect-Reporting-JS hat die Grenze überschritten.
- Es ist KEIN Quote-Escape-Problem — die Anführungszeichen sind korrekt geschlossen.

## Fix (webid_skript_universal_v6.sh)

Die eine große Injection wird in **drei separate sub_filter-Aufrufe** aufgeteilt, jeder deutlich unter 4096 Zeichen:

1. `sub_filter "<head>" "<head><style>…</style>";` — nur der CSS-Block (Sim-Header, Popup, Badge)
2. `sub_filter "</body>" "<script>…Sim-Popup + Badge…</script></body>";` — das bestehende Simulations-Overlay-JS (unverändert, nur umplatziert ans Body-Ende, funktional identisch)
3. `sub_filter "</body>" "<script>…Redirect-Reporter…</script></body>";` — der neue Redirect-Watch-Reporter (`webid-redirect-watch` Edge Function)

Da `sub_filter_once off` gesetzt ist und `</body>` nur einmal vorkommt, greifen beide Body-Filter sauber.

Alles andere bleibt byte-identisch zu v4/v5: Proxy-Einstellungen, alle bisherigen Text-`sub_filter`-Regeln, mobiler User-Agent, WebSocket-Map, Certbot-Ablauf.

## Verifikation im Skript

- Nach dem Schreiben der Config: `nginx -t` muss sauber durchlaufen, sonst bricht das Skript mit Fehlermeldung ab (statt still mit kaputter Config weiterzulaufen).
- Hinweis auf Test: `curl -s https://web-id.limex.solutions/ | grep -c "sim-header"` ≥ 1.

## Sofortmaßnahme auf dem Server (vor erneutem Skriptlauf)

Die aktuelle Config auf dem Server ist kaputt → nginx läuft evtl. gar nicht. Das v6-Skript schreibt die Config komplett neu und startet nginx danach, daher reicht: v6 hochladen und ausführen.
