# v10: Vollständige Redirect-Erfassung

Ziel: Jeder Wechsel weg von der aktuellen Seite (manuell oder automatisch, gleiches Tab oder neues Tab) wird an die bestehende Edge Function `webid-redirect-watch` gemeldet.

## Was neu erfasst wird (zusätzlich zu v8)

Im injizierten `<head>`-Reporter-Script wird ergänzt:

1. **`beforeunload` / `pagehide`** — feuert bei jedem Verlassen der Seite (auch bei Server-30x, Back/Forward, manuelle URL-Änderung, Tab-Schließen). Meldet aktuelle `location.href` als `page_leave`, mit Grund (`pagehide` / `beforeunload`).
2. **`visibilitychange` → hidden** kombiniert mit `pagehide` als zuverlässiger Trigger auf iOS Safari (dort feuert `beforeunload` oft nicht).
3. **`history.pushState` / `history.replaceState`** monkey-patch → meldet SPA-Navigation als `history_push` / `history_replace`.
4. **`popstate`** → meldet Back/Forward als `popstate`.
5. **`form.submit()`** (programmatisch, ohne Submit-Event) monkey-patch auf `HTMLFormElement.prototype.submit`.
6. **Statische `<meta http-equiv="refresh">`** beim Start scannen (nicht nur MutationObserver für später eingefügte).
7. **Alle Link-Klicks** (nicht nur externe/neue Tabs) — jeder `<a href>`-Klick wird gemeldet, damit auch interne Navigation im gleichen Tab erfasst ist. Klassifizierung `internal` / `external` / `new_tab` bleibt im Payload.
8. **`location.hash` / direktes Setzen von `location` (=Wert)** — via bestehender `href`-Setter-Trap bereits abgedeckt; zusätzlich `hashchange`-Event als `hash_change`.

Alle Meldungen weiterhin über `sendBeacon` mit `text/plain;charset=UTF-8`-Blob + `fetch keepalive`-Fallback (kritisch, damit Requests beim Unload noch rausgehen). Deduplizierung 3 s pro `source|url` bleibt.

## Was unverändert bleibt

- Alle `sub_filter`-Regeln, CSS/Header/Popup-Injektionen aus v8 (Block A + C) byte-identisch.
- Nginx-Config, Certbot, Firewall.
- Edge-Function-URL: `https://laozvnaupdecerpvwzmh.supabase.co/functions/v1/webid-redirect-watch`.
- Payload-Grundfelder: `url`, `source`, `userAgent`, `referrer`, `pageUrl`, plus quellenspezifische Extras (`target`, `newTab`, `method`, `reason`).

## Deliverable

Eine Datei `/mnt/documents/webid_skript_universal_v10.sh` — Kopie von v8, nur Block B (Reporter-Script vor `</head>`) ist ersetzt. Muss unter 4096 Zeichen pro `sub_filter`-Ersetzung bleiben (minifiziert, einfache Anführungszeichen).

## Hinweis zur Grenze

Server-Redirects (HTTP 30x vom Upstream) laufen serverseitig und werden vom Browser-JS **nicht** direkt gesehen. Sie werden jedoch indirekt über `pagehide` beim Verlassen der aktuellen Seite erfasst — die Ziel-URL steht dann allerdings noch nicht fest, nur die verlassene. Für die echte Ziel-URL bei 30x wäre zusätzlich ein Nginx-`header_filter` mit Lua nötig (nicht Teil dieses Plans; sag Bescheid, falls gewünscht).
