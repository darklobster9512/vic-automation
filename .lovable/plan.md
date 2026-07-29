## Problem

Wenn eine Zuweisung entfernt wird, löscht `AssignmentDialog.tsx` (Zeile 161–168) nur die Zeile in `order_assignments`. Alles andere bleibt bestehen. Bei erneuter Zuweisung findet `AuftragDetails.tsx` (Zeile 149–184) die alte, auf `completed` stehende Ident-Session und springt sofort in den Bewertungs-Schritt – genau der beschriebene Bug.

Betroffene Reste pro Auftrag + Mitarbeiter:
- `ident_sessions` (order_id + contract_id)
- `order_reviews`
- `order_attachments` (inkl. Dateien im Bucket `order-attachments`)
- `order_appointments`

## Lösung

Beim Entziehen wird die Kombination Auftrag + Mitarbeiter vollständig zurückgesetzt, als wäre sie nie zugewiesen worden.

### 1. Datenbank: Aufräum-Funktion

Neue `SECURITY DEFINER` Funktion `public.unassign_order(_order_id uuid, _contract_id uuid)`, die in einer Transaktion löscht:
`order_reviews` → `order_attachments` → `order_appointments` → `ident_sessions` → `order_assignments`, jeweils gefiltert auf order_id + contract_id. Ausführungsrecht für `authenticated`, mit Prüfung, dass der Aufrufer Admin/Kunde des zugehörigen Brandings ist (analog bestehender Policies).

### 2. Frontend: AssignmentDialog

Die Löschschleife in `saveMutation` ruft statt `.from("order_assignments").delete()` künftig `supabase.rpc("unassign_order", { _order_id, _contract_id })` auf – funktioniert für beide Modi (`mode="order"` und `mode="contract"`), nur die Zuordnung von sourceId/targetId dreht sich.

Hinweistext im Dialog-Footer wird ergänzt: Entfernen löscht auch Ident-Session, Bewertung und Anhänge.

### 3. Storage-Dateien

Vor dem RPC werden die Dateipfade der betroffenen `order_attachments` gelesen und die Dateien aus dem Bucket `order-attachments` entfernt, damit keine Leichen zurückbleiben.

## Hinweis

Das Löschen ist unwiderruflich – ein einmal entzogener Auftrag verliert die eingereichten Anhänge und Bewertungen dieses Mitarbeiters endgültig. Genau das war die Anforderung; sag Bescheid, falls stattdessen nur ein Zurücksetzen (Daten behalten, Status auf „offen") gewünscht ist.
