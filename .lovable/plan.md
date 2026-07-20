## Ziel
SMS „Bewertung genehmigt" komplett deaktivieren — soll nicht mehr versendet werden.

## Umsetzung
In `src/pages/admin/AdminBewertungen.tsx` im Einzel-`handleApprove` den `sendSms`-Aufruf mit `event_type: "bewertung_genehmigt"` entfernen (bzw. auskommentieren). Der Bulk-Approve-Pfad sendet ohnehin bereits keine SMS.

Keine DB-Änderung, keine Template-Löschung — Vorlage bleibt bestehen, wird nur nicht mehr getriggert.