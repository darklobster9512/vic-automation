# Plan: Anhänge nach Neuestem sortieren

## Ziel
`/admin/anhaenge` soll automatisch so sortiert werden, dass die zuletzt eingereichten Anhänge immer ganz oben stehen.

## Aktueller Stand
In `src/pages/admin/AdminAnhaenge.tsx` werden die Anhänge pro Vertrag/Auftrag gruppiert und das Feld `latest_created_at` bereits ermittelt. Die Gruppen werden aber am Ende nicht explizit nach diesem Zeitstempel sortiert.

## Änderung
- Nach dem Erstellen der Gruppen (`Array.from(map.values())`) wird das Array absteigend nach `latest_created_at` sortiert.
- Dadurch erscheinen neue Einreichungen in allen drei Tabs (Eingereicht, Genehmigt, Abgelehnt) oben.

## Technische Details
- Datei: `src/pages/admin/AdminAnhaenge.tsx`
- Zeile ~100: `return Array.from(map.values());` wird ersetzt durch eine sortierte Rückgabe.
- Sortierung: `new Date(b.latest_created_at).getTime() - new Date(a.latest_created_at).getTime()`
