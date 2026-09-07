# Eingereichte Arbeitsverträge zurücksetzen (LIMEX, Codebricks, Vendis)

Betroffen sind 37 Personen mit Status "eingereicht":
- Codebricks GmbH: 19
- LIMEX Solutions GmbH: 14
- Vendis Development Services GmbH: 4

## Was passiert

1. Alle eingereichten Vertragsdaten dieser 37 Personen werden geleert (persönliche Angaben, Geburtsdaten, Adresse, Steuer-/Sozialversicherungsdaten, Bankverbindung, Ausweis-Uploads, Unterschrift, Vertrags-PDFs, gewählte Vertragsform, Einreichungszeitpunkt). Der Status geht zurück auf "offen".
2. Der Mitarbeiter-Zugang selbst bleibt bestehen (Login, Chatverlauf, Aufträge, Termine, Guthaben) – nur die Vertragsangaben sind wieder leer, sodass jede Person die Vertragsform neu auswählen und alle Daten neu ausfüllen muss.
3. Danach bekommt jede dieser 37 Personen eine E-Mail und eine SMS mit der Aufforderung, den Arbeitsvertrag neu auszufüllen, inklusive Link zum Portal des jeweiligen Brandings.

Hinweis: Die Zeilen werden bewusst nicht komplett gelöscht, weil daran Konto, Aufträge, Bewertungen und Chatverlauf hängen. Das Ergebnis für die Person ist identisch mit "von vorne ausfüllen".

## Nachricht

SMS: "Hallo {Vorname}, aus technischen Gründen müssen wir dich bitten, deinen Arbeitsvertrag im Portal erneut auszufüllen: {Portal-Link}"

E-Mail: gleiche Aussage im Branding-Layout mit Button "Arbeitsvertrag ausfüllen".

## Technische Umsetzung

- SQL-Update auf `public.employment_contracts` für `status = 'eingereicht'` und `branding_id` der drei Brandings: alle Vertragsfelder auf NULL, `status = 'offen'`, `submitted_at = NULL`, `template_id = NULL`, `contract_dismissed = false`.
- Versand über die bestehenden Edge Functions `send-email` (direkter Resend-Versand) und `send-sms` (branding-spezifische seven.io-Konfiguration), pro Empfänger mit `buildBrandingUrl`-Link auf das Portal.
- Versand als einmaliges Skript über die Edge Functions ausgelöst; kein neuer Automatismus, keine sonstigen Benachrichtigungen (Telegram bleibt aus).
