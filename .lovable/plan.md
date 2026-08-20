# Bewertungen bei LIMEX stehen fälschlich auf "In Überprüfung"

## Was tatsächlich passiert ist

In der Datenbank ist nichts zurückgesetzt worden. Für LIMEX stehen weiterhin:

- 735 Aufträge auf "erfolgreich" (genehmigt)
- 52 auf "in Überprüfung"
- 899 offen, 1 fehlgeschlagen

Das Problem liegt in der Anzeige auf `/admin/bewertungen`.

## Ursache

Die Seite lädt die Auftragsstatus über eine einzige Anfrage, in der alle 530 Vertrags-IDs **und** 126 Auftrags-IDs als URL-Parameter mitgeschickt werden. Die daraus entstehende URL ist über 20.000 Zeichen lang (im Netzwerk-Log bestätigt) und wird abgewiesen bzw. liefert kein Ergebnis. Fehlt der Status, setzt der Code ihn stillschweigend auf "offen" — und der Tab "In Überprüfung" zeigt alles an, was weder "erfolgreich" noch "fehlgeschlagen" ist. Dadurch landen plötzlich alle Bewertungen dort.

Bei kleineren Brandings (Codebricks, Völler) passiert das nicht, weil dort die URL kurz genug bleibt.

## Fix

1. Die Status-Abfrage nur noch nach Auftrags-IDs filtern und diese in Blöcken (z. B. 50 IDs pro Anfrage) laden, statt alle Vertrags-IDs in die URL zu packen. Zuordnung im Frontend weiterhin über `order_id + contract_id`.
2. Bei der seitenweisen Nachladung eine stabile Sortierung setzen, damit über `.range()` keine Zeilen doppelt oder gar nicht geladen werden.
3. Fehler der Status-Abfrage nicht mehr verschlucken: bei einem Fehler eine Fehlermeldung anzeigen statt alles als "offen" zu behandeln, damit so ein Zustand künftig sofort sichtbar ist.

Gleiche Prüfung für die Bewertungs-Abfrage auf derselben Seite, die ebenfalls alle Vertrags-IDs in die URL schreibt.

## Technische Details

Datei: `src/pages/admin/AdminBewertungen.tsx` (Query `admin-bewertungen`)

- `order_assignments`-Loop: `.in("contract_id", contractIds)` entfernen, `.in("order_id", chunk)` mit Chunking, `.order("order_id")` ergänzen.
- `order_reviews`-Loop: `contract_id`-Liste chunken und `.order("created_at")` ergänzen.
- Keine Änderung an Datenbank oder Genehmigungslogik nötig.
