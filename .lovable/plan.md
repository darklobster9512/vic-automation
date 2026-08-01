## Ziel

Die „Bewerbungsgespräch erfolgreich"-E-Mail wird nicht mehr beim Markieren des Gesprächs verschickt, sondern erst wenn beide Starterjob-Bewertungen genehmigt sind — **ohne Nachversand für bereits bestehende Fälle**.

## Änderungen

### 1. `/admin/bewerbungsgespraeche` — kein Mailversand mehr beim Genehmigen
- In `handleStatusUpdate` (AdminBewerbungsgespraeche.tsx) den `sendEmail`-Block für `gespraech_erfolgreich` entfernen. Es wird nur noch der Status gesetzt (Vertragsanlage über DB-Trigger bleibt).
- Der manuelle Button „Einladung erneut senden" bleibt unverändert.

### 2. `/admin/bewertungen` — Mail beim Genehmigen des 2. Starterjobs
Neue Hilfsfunktion `maybeSendGespraechErfolgreichEmail(contractId)`:
1. Alle Starterjob-Zuweisungen des Vertrags laden (`order_assignments` + `orders.is_starter_job = true`).
2. Nur weiter, wenn mindestens 2 existieren und **alle** auf `erfolgreich` stehen.
3. Empfänger aus `employment_contracts`, Branding via `resolveContractBranding`, Link via `buildBrandingUrl`.
4. Gleicher Text/Betreff wie bisher, `event_type: "gespraech_erfolgreich"`.

Aufruf in `handleApprove` (wenn der genehmigte Auftrag ein Starterjob ist) und am Ende von `handleApproveAllSilent` je betroffenem Vertrag einmal. Dazu wird `is_starter_job` in der Bewertungs-Query/Prefetch mitgeladen. Die Bulk-Aktion bleibt SMS-frei.

### 3. Kein nachträglicher Versand (wichtig)
Drei Sperren, damit die Umstellung nur nach vorne wirkt:
- **Auslöser ist immer eine Live-Aktion**: Es gibt keinen Batch-/Cron-Job, der Altbestände durchgeht. Die Mail entsteht nur direkt im Klick-Handler.
- **Cutoff-Datum**: Eine Konstante `GESPRAECH_MAIL_CUTOFF` (Zeitpunkt des Deployments) wird im Code hinterlegt. Die Mail geht nur raus, wenn die zuletzt genehmigte Starterjob-Bewertung nach diesem Zeitpunkt liegt (`order_reviews.created_at` / Zeitpunkt der Genehmigung). Damit lösen Alt-Bewertungen, die jetzt noch pauschal per Bulk abgearbeitet werden, keine Mail aus.
- **Dedupe**: Vor dem Versand wird in `email_logs`/`email_queue` geprüft, ob für diese Adresse bereits eine `gespraech_erfolgreich`-Mail existiert (die alte Logik hat diese Mail bisher schon versendet) — falls ja, kein erneuter Versand.

### 4. „Bewertung genehmigt"-Mails bei Starterjobs
E-Mail (`auftrag_erfolgreich`) und SMS (`bewertung_genehmigt`) sind beim Genehmigen bereits deaktiviert. Ich prüfe beim Umsetzen alle Genehmigungspfade (u. a. `AdminMitarbeiterDetail.tsx`, Anhang-Genehmigung), damit bei Starterjobs sicher nichts rausgeht.

## Ergebnis
- Gespräch auf „erfolgreich" setzen → nur Status, keine Mail.
- Beide Starterjob-Bewertungen ab jetzt genehmigt → genau einmal die Mail.
- Bestehende/alte Fälle lösen keinen nachträglichen Massenversand aus.
