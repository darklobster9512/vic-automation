# „Gespräch erfolgreich": SMS auch dann senden, wenn die E-Mail scheitert

## Was geprüft wurde
- Die SMS-Funktion arbeitet: bis heute 14:25 Uhr (UTC) ging zu jeder erfolgreichen E-Mail auch eine SMS raus.
- Ab 14:25 Uhr sind bei Codebricks alle 10 „Gespräch erfolgreich"-E-Mails fehlgeschlagen. Der Grund: Die Absender-Domain beim E-Mail-Dienst (Resend) von Codebricks ist nicht bestätigt.
- Das System schickt die SMS erst **nach** der E-Mail. Scheitert die E-Mail, bricht der Vorgang ab, und die SMS wird gar nicht erst versucht. Deshalb steht davon auch nichts im SMS-Verlauf.
- Betroffen sind: Tania Puspita Firdausy Ehrler, Shanice Ehioghiren, Johannes Peter Walter, Patrik Lubitz, Christine Röslmair, Norbert Beyer, Arthur Ratajczak, Nikolai Nikolaenko, Mike Mehlau, dazu ein weiterer Empfänger (stdejan78@gmail.com).
- Nebenbei: Diese Personen würden die Nachricht auch später nie mehr bekommen, weil der fehlgeschlagene Versuch als „schon verschickt" zählt.

## Was geändert wird
1. SMS und E-Mail laufen unabhängig voneinander. Scheitert die E-Mail, geht die SMS trotzdem raus, und umgekehrt.
2. Die Sperre gegen doppelten Versand zählt nur noch erfolgreich verschickte Nachrichten, getrennt für E-Mail und SMS.
3. Nach der Genehmigung zeigt eine Meldung an, wenn die E-Mail oder die SMS nicht rausging, damit das nicht mehr unbemerkt bleibt.
4. Die SMS für die 10 Betroffenen wird einmalig nachgeschickt, direkt nach dem Umbau.

## Was du selbst tun musst
- Bei Resend die Domain von Codebricks bestätigen oder im Branding einen gültigen Schlüssel eintragen. Solange das fehlt, scheitern alle Codebricks-E-Mails. Danach kann ich die 10 E-Mails auch nachschicken.

## Technische Details
- `src/lib/starterJobSuccessEmail.ts`: `sendEmail` in einen eigenen try/catch packen. Die Dedupe-Prüfung für die Mail läuft auf `email_logs` mit `status='sent'` plus `email_queue`. Die SMS bekommt eine eigene Dedupe-Prüfung auf `sms_logs` (`event_type='gespraech_erfolgreich'`, `status='sent'`, Telefonnummer-Suffix). Rückgabe als `{ emailSent, smsSent, errors }`, und die Aufrufer in `AdminBewertungen.tsx` zeigen bei Fehlern einen Toast.
- Das Nachsenden läuft einmalig über die bestehende `send-sms`-Funktion für die 10 Verträge, mit Branding-Shortlink wie bisher.
