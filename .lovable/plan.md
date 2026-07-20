## Ziel
Der Button „Alle genehmigen (ohne SMS)" im Tab „In Überprüfung" soll ausschließlich Bewertungen von **Platzhalter-Aufträgen** (`order_type === "platzhalter"`) genehmigen.

## Umsetzung in `src/pages/admin/AdminBewertungen.tsx`

1. Aufruf ändern: `handleApproveAllSilent(pendingReviews.filter(r => r.order_type === "platzhalter"))`.
2. Button-Label + Count auf gefilterte Liste umstellen: `Alle Platzhalter genehmigen (ohne SMS) · {count}`.
3. Button ausblenden/disablen, wenn keine Platzhalter-Reviews offen sind.

Keine Änderung an der Genehmigungslogik selbst.