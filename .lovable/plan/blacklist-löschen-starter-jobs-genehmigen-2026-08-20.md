# Blacklist löschen + Starter-Jobs genehmigen

Zwei neue Sammel-Buttons in den Admin-Seiten.

## 1. /admin/bewerbungen — "Blacklist löschen"

- Neuer Button in der Kopfzeile über der Liste, nur sichtbar wenn mindestens eine Bewerbung im aktuellen Branding ein Blacklist-Badge hat.
- Beschriftung mit Anzahl, z. B. „Blacklist löschen · 12".
- Klick öffnet einen Bestätigungsdialog (Anzahl + Hinweis, dass die Bewerbungen endgültig gelöscht werden).
- Nach Bestätigung werden alle betroffenen Bewerbungen des aktiven Brandings gelöscht (gebündelt), danach Toast mit Anzahl und Liste neu laden.
- Betroffen sind ausschließlich Bewerbungen, deren E-Mail bereits in einem anderen Branding existiert — also genau die mit rotem „Blacklist"-Badge.

## 2. /admin/bewertungen — "Alle Starter-Jobs genehmigen"

- Neuer Button direkt neben „Alle Platzhalter genehmigen (ohne SMS)" im Tab „In Überprüfung".
- Genehmigt alle offenen Bewertungen, deren Auftrag ein Starter-Job ist — gleiche Logik wie beim Platzhalter-Button (ohne SMS, Anhang-Prüfung, Guthaben-Gutschrift, Einladungs-Mail nach zwei genehmigten Starter-Jobs).
- Button nur sichtbar, wenn es offene Starter-Job-Bewertungen gibt; Beschriftung mit Anzahl.

## Technische Details

`src/pages/admin/AdminBewerbungen.tsx`:
- Aus der bestehenden `blacklistMap`-Query die IDs der betroffenen Bewerbungen ableiten (Filter über die geladene Liste).
- Neue Mutation: `supabase.from("applications").delete().in("id", chunk)` in Chunks à 100, danach `invalidateQueries(["applications"])` und die Blacklist-Query.
- Bestätigung über die vorhandene shadcn-`AlertDialog`/`Dialog`-Komponente.

`src/pages/admin/AdminBewertungen.tsx`:
- Orders-Select (Zeile ~167) um `is_starter_job` erweitern und das Feld in `GroupedReview` (`is_starter_job: boolean`) mitführen.
- Filter `pendingReviews.filter(r => r.is_starter_job)` und `handleApproveAllSilent(...)` wiederverwenden — keine neue Genehmigungslogik.

Keine Datenbank-Änderungen nötig.
