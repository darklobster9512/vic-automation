# Auftragsnamen bei /admin/idents wieder anzeigen

## Ursache
Die Seite lädt die Auftragstitel für alle Idents in einer einzigen Abfrage. 2 der 686 Idents haben keinen Auftrag – dieser leere Wert landet mit in der Liste, die Datenbank lehnt die ganze Abfrage ab, und darum steht überall nur „...“. Bei so vielen Idents wird die Abfrage außerdem sehr lang.

## Fix
- Leere Auftrags- und Vertrags-IDs vor dem Laden herausfiltern.
- Titel und Namen in Blöcken von je 100 laden, damit die Abfrage nicht zu lang wird.
- Idents ohne Auftrag zeigen „Kein Auftrag“ statt „...“.

## Technische Details
`src/pages/admin/AdminIdents.tsx`: `orderIds`/`contractIds` mit `.filter(Boolean)` bereinigen, `.in()` in einer Schleife mit Blöcken à 100 ausführen, Fehler werfen statt verschlucken, `getOrderTitle` gibt bei null „Kein Auftrag“ zurück.
