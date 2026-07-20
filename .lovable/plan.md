## Ziel
Alle Bewertungen mit Status „in Überprüfung" auf `/admin/bewertungen` per Bulk-Aktion genehmigen — **ohne SMS-Versand**.

## Umsetzung

In `src/pages/admin/AdminBewertungen.tsx`:

1. Neuen Button **„Alle genehmigen (ohne SMS)"** über der Tabelle im Tab „In Überprüfung" einfügen (nur sichtbar wenn `pendingReviews.length > 0`).
2. Handler `handleApproveAllSilent()`:
   - Über alle `pendingReviews` iterieren.
   - Pro Eintrag dieselbe Logik wie `handleApprove` ausführen (Anhänge-Check → Status `erfolgreich` oder `in_pruefung`, Prämie gutschreiben bei `per_order`), **aber den `sendSms`-Aufruf komplett auslassen**.
   - Fortschritt via toast anzeigen (`x / n`), am Ende Summary-Toast.
3. Query invalidieren.
4. Bestehende Einzel-Buttons und `handleApprove` bleiben unverändert.

Keine DB-/RLS-Änderungen nötig.
