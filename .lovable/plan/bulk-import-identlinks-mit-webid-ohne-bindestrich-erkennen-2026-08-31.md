# Bulk-Import: Identlinks mit `webid.` (ohne Bindestrich) erkennen

Der Parser in `BulkPrepImportDialog.tsx` erkennt Identlinks aktuell nur über den Regex `^https?:\/\/web-id\.` — Links mit der neuen Domain `https://webid.limex.solutions/...` (ohne Bindestrich) werden deshalb nicht als Identlink erkannt und das Feld bleibt leer.

## Änderung

In `src/components/admin/BulkPrepImportDialog.tsx` (Zeile 71) den Regex erweitern, sodass beide Varianten matchen:

```ts
const identLink = lines.find((l) => /^https?:\/\/web-?id\./i.test(l)) || null;
```

Damit werden sowohl `web-id.limex.solutions` als auch `webid.limex.solutions` erkannt.

## Prüfung

- Bestehender Import-Text mit alten `web-id.`-Links funktioniert weiter.
- Neue `webid.`-Links erscheinen in der Vorschau als erkanntes Identlink (✓) und werden ins `Identlink`-Testdaten-Feld übernommen.
