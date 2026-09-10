# „Wir sind wieder erreichbar“ an alle Codebricks-Mitarbeiter (E-Mail + SMS)

## Ziel
Einmaliger Versand an alle aktiven Mitarbeiter des Brandings Codebricks: E-Mail und SMS mit dem Hinweis, dass die Website unter der neuen Domain **https://app.codebricks.solutions** wieder erreichbar ist.

## Umsetzung
1. **Neuer Dialog** `src/components/admin/WebsiteAnnouncementDialog.tsx` (angelehnt an den bestehenden `DomainAnnouncementDialog`, aber ohne Passwort-Inhalte):
   - E-Mail-Vorschau im bestehenden Premium-E-Mail-Layout (`buildEmailHtml`) mit Codebricks-Branding.
   - Betreff: „Unsere Website ist wieder erreichbar – Codebricks"
   - Text: Entschuldigung für die technischen Probleme + Hinweis auf neue Domain `https://app.codebricks.solutions` + Button „Zur Website" → `https://app.codebricks.solutions`.
   - Editierbarer SMS-Text, Standard: „Hallo {vorname}, wir entschuldigen uns für die technischen Probleme. Unsere Website ist wieder erreichbar: {link}" (Link = `https://app.codebricks.solutions`).
   - Anzeige der Empfängerzahl, Fortschrittsbalken beim Versand, Abschluss-Toast mit Anzahl E-Mails/SMS/Fehler.

2. **Empfänger**: alle `employment_contracts` des Codebricks-Brandings mit Status offen/eingereicht/genehmigt/unterzeichnet, `is_suspended = false`. E-Mail an alle mit E-Mail-Adresse, SMS an alle mit Telefonnummer; Duplikate werden entfernt (E-Mail lowercase, Telefon normalisiert).

3. **Einbindung**: In `AdminBrandings.tsx` Button (Megafon-Icon) in der Codebricks-Zeile, der den Dialog öffnet.

4. **Versand**: Frontend-Batching über bestehende `sendEmail` (event_type `website_wieder_erreichbar`) und `sendSms` mit ~150 ms Pause pro Mitarbeiter; beide landen wie gewohnt in den E-Mail-/SMS-Logs.

## Nicht enthalten
- Keine Änderung an bestehenden Templates oder Edge Functions.
- Kein Versand an andere Brandings.
- Keine weiteren automatischen Benachrichtigungen.
