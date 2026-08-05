# SMS parallel zur „Gespräch erfolgreich"-Mail

Wenn beide Starterjob-Bewertungen genehmigt sind und die „Bewerbungsgespräch erfolgreich"-E-Mail rausgeht, soll zusätzlich eine SMS mit Portal-Link verschickt werden.

## Ablauf

1. Admin genehmigt die zweite Starterjob-Bewertung (/admin/bewertungen).
2. Bestehende Prüfung läuft wie bisher (beide Starterjobs erfolgreich, Cutoff, Dedupe).
3. Mail wird eingereiht — direkt danach zusätzlich die SMS.
4. Schlägt der SMS-Versand fehl, bleibt die Mail trotzdem gültig (Fehler wird nur geloggt).

## SMS-Inhalt

Neues Template `gespraech_erfolgreich` unter /admin/sms (dort später frei editierbar):

> Hallo {name}, Ihre Starteraufträge wurden erfolgreich geprüft! Bitte reichen Sie jetzt Ihre Vertragsdaten ein: {link}

`{link}` ist ein gekürzter Branding-Link auf das Portal (gleiches Ziel wie der Mail-Button), erzeugt über die bestehende Shortlink-Logik.

## Technische Details

- `src/lib/starterJobSuccessEmail.ts`: nach `sendEmail(...)` Telefonnummer aus `employment_contracts` mitladen, Template `gespraech_erfolgreich` aus `sms_templates` holen, `{name}`/`{link}` ersetzen, `createShortLink` + `sendSms` mit `event_type: "gespraech_erfolgreich"` und `branding_id` aufrufen, in try/catch.
- Migration: Zeile in `sms_templates` für `event_type = 'gespraech_erfolgreich'`, Label „Gespräch erfolgreich / Vertragsdaten einreichen".
- Dedupe: SMS nur, wenn die Mail in diesem Durchlauf tatsächlich eingereiht wurde (die vorhandenen Early-Returns greifen bereits), zusätzlich Abbruch wenn keine Telefonnummer hinterlegt ist.
- Keine Änderung an Mailinhalt, Cutoff oder Bewertungs-Logik.
