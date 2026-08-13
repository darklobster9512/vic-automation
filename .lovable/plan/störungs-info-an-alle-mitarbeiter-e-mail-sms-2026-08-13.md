# Störungs-Info an alle Mitarbeiter (E-Mail + SMS)

## Ziel
Auf `/admin/brandings` pro Branding ein Button, der eine Entschuldigungs-Nachricht für die technischen Probleme mit der neuen Domain an alle aktiven Mitarbeiter des Brandings verschickt — als E-Mail und zusätzlich als SMS.

## Ablauf im Admin
1. Neuer Button (Megafon-Icon) in der Aktionsspalte jeder Branding-Zeile: "Störungs-Info senden".
2. Popup Schritt 1: Eingabefeld für die neue Domain (z. B. `limex-solutions.gmbh`), Weiter.
3. Popup Schritt 2: Vorschau der E-Mail (gleiches Layout wie unter /admin/emails) inkl. eingesetzter Domain, darunter der SMS-Text und die Anzahl der Empfänger ("Wird an 87 Mitarbeiter gesendet").
4. Bestätigen → Versand mit Fortschrittsanzeige, danach Erfolgsmeldung mit Anzahl E-Mails/SMS.

## Empfänger
Alle Verträge (`employment_contracts`) des Brandings mit Status eingereicht/genehmigt/unterzeichnet/offen, die **nicht** gesperrt sind (`is_suspended = false`). E-Mail geht an alle mit hinterlegter E-Mail, SMS an alle mit Telefonnummer; doppelte Adressen/Nummern werden entfernt.

## E-Mail-Vorlage (neu: "Website wieder erreichbar")
- Betreff: „Unsere Website ist wieder erreichbar – {Firmenname}"
- Titel: „Technische Störung behoben"
- Text:
  - „Hallo Max Mustermann,"
  - „wir möchten uns für die technischen Probleme heute Morgen entschuldigen."
  - „Unsere Website ist ab sofort wieder erreichbar unter %neue_domain%."
  - „Vielen Dank für Ihr Verständnis."
- Button: „Zur Website" → `https://%neue_domain%`
- Erscheint auch in der Vorschau-Liste unter /admin/emails (Platzhalter-Domain in der Beispielansicht).

## SMS-Vorlage (neu, in /admin/sms-templates editierbar)
- event_type `website_wieder_erreichbar`, Label „Website wieder erreichbar"
- Standardtext: „Hallo {vorname}, wir entschuldigen uns für die technischen Probleme heute Morgen. Unsere Website ist wieder erreichbar: {link}"
- Platzhalter `{vorname}` und `{link}` werden beim Versand ersetzt; der Text ist pro Branding anpassbar.

## Technische Details
- Migration: `sms_templates`-Zeile mit `event_type = 'website_wieder_erreichbar'` für jedes bestehende Branding einfügen (ohne Duplikate).
- Neue Komponente `src/components/admin/DomainAnnouncementDialog.tsx` (2-Schritt-Dialog, Vorschau nutzt den bestehenden E-Mail-Vorschau-Renderer aus AdminEmails, ausgelagert falls nötig).
- `src/pages/admin/AdminBrandings.tsx`: Button + Dialog-State pro Branding.
- Versand im Frontend in Batches (kleine Pause zwischen den Sendungen, damit Queue/Provider nicht überlastet werden) über `sendEmail` (`event_type: "website_wieder_erreichbar"`) und `sendSms` mit dem aus `sms_templates` geladenen Text; Link per `createShortLink` auf `https://{neue_domain}` gekürzt.
- Keine Änderung an bestehenden Templates oder Edge Functions.
