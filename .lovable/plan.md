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
4. Einmaliges Nachsenden an die 10 Betroffenen: E-Mail und SMS mit demselben Text und Link wie sonst. Du hast den Resend-Schlüssel bei Codebricks schon geändert. Zuerst geht eine einzelne E-Mail raus, um den Schlüssel zu testen. Klappt das, folgen die restlichen, jeweils mit ein paar Sekunden Abstand.
5. Danach zeige ich dir pro Person, ob E-Mail und SMS angekommen sind.

## Technische Details
- `src/lib/starterJobSuccessEmail.ts`: `sendEmail` in einen eigenen try/catch packen. Die Dedupe-Prüfung für die Mail läuft auf `email_logs` mit `status='sent'` plus `email_queue`. Die SMS bekommt eine eigene Dedupe-Prüfung auf `sms_logs` (`event_type='gespraech_erfolgreich'`, `status='sent'`, Telefonnummer-Suffix). Rückgabe als `{ emailSent, smsSent, errors }`, und die Aufrufer in `AdminBewertungen.tsx` zeigen bei Fehlern einen Toast.
- Das Nachsenden läuft einmalig über die bestehenden Funktionen `send-email` und `send-sms` (Event `gespraech_erfolgreich`, Branding Codebricks, Portal-Shortlink) für die 10 Empfänger aus `email_logs` mit `status='failed'` seit 25.09. 14:25 UTC.
