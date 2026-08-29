# Fix: Redirects in neuen Tabs werden nicht gemeldet

## Problem

Der Client-Reporter in v7 meldet aktuell nur Navigationen, deren Ziel-URL als „extern“ erkannt wird. Neue Tabs, die per Button oder Link geöffnet werden, fallen häufig durchs Raster:

- `<a target="_blank" href="...">` mit interner/relativer URL wird ignoriert (isExternal-Filter).
- Middle-Click / Cmd/Strg-Click löst kein normales `click`-Event mit Navigation aus (`auxclick` fehlt).
- `<form target="_blank">`-Submits werden nicht abgefangen.
- Buttons, die per JS `window.open(url, '_blank')` aufrufen mit relativer URL, werden ebenfalls verworfen.
- Meldungen innerhalb von Iframes hängen davon ab, dass `sub_filter` dort greift; für Cross-Origin-Iframes nicht relevant, für same-origin schon.

## Fix (nur JS-Block in v7 ersetzen, Rest 1:1 lassen)

Reporter-Regel neu: **jede** Navigation in einen neuen Tab wird gemeldet, unabhängig davon ob extern. Für In-Tab-Navigationen bleibt der externe Filter, damit interne SPA-Klicks nicht spammen.

Konkret im Interceptor:

1. `window.open(u, target, ...)` immer melden (Quelle `window_open`, inklusive `target`).
2. Click-Handler: wenn `a.target === '_blank'` ODER Middle/Cmd/Ctrl-Click → immer melden, sonst nur wenn extern. Zusätzlich `auxclick` binden.
3. `submit`-Handler auf `document`: wenn `form.target === '_blank'` oder Action extern → melden.
4. `location.assign/replace` und `location.href`-Setter wie gehabt (extern-Filter bleibt).
5. Meta-Refresh MutationObserver bleibt.
6. Payload zusätzlich um `target` und `newTab: true|false` erweitern, damit auf der Empfänger-Seite unterscheidbar.

## Auslieferung

Neue Datei `/mnt/documents/webid_skript_universal_v8.sh`:
- Basis: v7 unverändert.
- Ersetzt ausschließlich den `sub_filter "</head>"`-JS-Block durch die erweiterte Version.
- Alle Parameter bleiben unter 4096 Zeichen, keine doppelten Suchmuster.

Test nach Ausführung (`sudo bash webid_skript_universal_v8.sh`):

```bash
curl -s https://web-id.limex.solutions/ | grep -c webid-redirect-watch   # >= 1
curl -s https://web-id.limex.solutions/ | grep -c 'auxclick'             # >= 1
```

Manuell im Browser einen Button klicken, der einen neuen Tab öffnet, und in der Supabase-Edge-Function-Logs prüfen, dass `source: "window_open"` bzw. `link_click` mit `newTab: true` ankommt.
