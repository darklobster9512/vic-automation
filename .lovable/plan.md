# Ticket schließen im Admin-Panel

Im Admin-Ticketbereich lässt sich der Status heute nur über ein Auswahlfeld in der Seitenspalte ändern. Es kommt ein klarer Schließen-Knopf dazu.

## Was gebaut wird

- In der Ticket-Detailansicht oben rechts (neben Ticketnummer/Betreff) ein Knopf:
  - "Ticket schließen" bei offenen Tickets
  - "Wieder öffnen" bei geschlossenen Tickets
- Vor dem Schließen eine kurze Rückfrage zur Bestätigung.
- In der Ticketliste erhält jede Zeile ein Schließen-Symbol als Schnellaktion.
- Nach dem Schließen: Erfolgsmeldung, Status-Badge und Zähler in den Tabs aktualisieren sich sofort; das Auswahlfeld bleibt zusätzlich vorhanden.

## Technische Details

- `src/pages/admin/AdminTickets.tsx`: neue Aktion nutzt das bestehende `patch()` (setzt `status` und `closed_at`), plus `AlertDialog` für die Bestätigung; Listen-Schnellaktion nutzt dieselbe Update-Logik wie `bulkSetStatus`.
- Keine Datenbank- oder Rechteänderungen nötig.
