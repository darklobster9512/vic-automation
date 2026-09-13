# Einmalige Störungs-Info an alle Codebricks-Mitarbeiter (14.09.2026, 08:00)

## Ziel
Am 14.09.2026 um 08:00 Uhr (Berliner Zeit) geht automatisch – ohne dass jemand etwas klicken muss – eine E-Mail und eine SMS an alle aktiven Codebricks-Mitarbeiter mit dem Hinweis, dass das Mitarbeiter-Portal wegen technischer Störungen unter **https://app.codebricks-gmbh.com** erreichbar ist.

## Empfänger
Alle Codebricks-Verträge mit Mitarbeiter-Account (`user_id` gesetzt) und nicht gesperrt (`is_suspended = false`) – aktuell 165 Personen. E-Mail an alle mit Adresse, SMS an alle mit Rufnummer, Dubletten (E-Mail klein geschrieben, Telefon normalisiert) werden entfernt.

## Inhalte
E-Mail (Codebricks-Layout, Absender wie gewohnt):
- Betreff: „Mitarbeiter-Portal aktuell unter neuer Adresse erreichbar – Codebricks GmbH"
- Titel: „Technische Störung – Portal unter neuer Adresse"
- Text: Anrede mit Vorname, Hinweis auf die technische Störung, Portal erreichbar unter https://app.codebricks-gmbh.com, Dank für das Verständnis.
- Button „Zum Mitarbeiter-Portal" → https://app.codebricks-gmbh.com

SMS:
- „Hallo {vorname}, aufgrund technischer Stoerungen ist das Mitarbeiter-Portal ab sofort hier erreichbar: https://app.codebricks-gmbh.com"

## Ablauf
1. Neue Hintergrund-Funktion `send-portal-announcement`, die die Empfänger lädt und E-Mail + SMS mit kurzer Pause zwischen den Empfängern verschickt. Alles landet wie gewohnt in den E-Mail- und SMS-Logs (Ereignistyp `portal_umzug_info`).
2. Einmaliger Zeitplan für den 14.09.2026 um 06:00 UTC (= 08:00 Uhr Berlin). Der Zeitplan löscht sich nach dem Lauf selbst, sodass die Nachricht garantiert nur einmal rausgeht.
3. Zusätzlicher Schutz gegen Doppelversand: Die Funktion prüft vor dem Start, ob für diesen Ereignistyp schon Mails protokolliert wurden, und bricht in dem Fall ab.

## Technische Details
- Neue Edge Function `supabase/functions/send-portal-announcement/index.ts`: Service-Role-Client, lädt Branding `7acd3258-1288-4778-930c-35d60f4f46ec` (Codebricks GmbH) und die Empfänger paginiert, ruft für jeden Empfänger `send-email` und `send-sms` intern auf (150 ms Pause), zählt Erfolge/Fehler und gibt eine Zusammenfassung zurück. Idempotenz-Check über `email_logs` mit `event_type = 'portal_umzug_info'`.
- Deployment über `supabase--deploy_edge_functions`.
- Zeitplanung per `cron.schedule('codebricks-portal-announcement', '0 6 14 9 *', ...)` mit `net.http_post` auf die Funktions-URL inkl. Publishable Key; im Funktionsaufruf-Body `{"unschedule":true}` ist nicht nötig – die SQL selbst enthält nach dem `net.http_post` ein `cron.unschedule('codebricks-portal-announcement')`, ausgelöst durch einen zweiten Job am 14.09.2026 um 06:10 UTC, der sich ebenfalls selbst entfernt. Damit läuft nichts dauerhaft weiter.
- Anmerkung zur Frequenz: Der Job läuft genau einmal am 14.09.2026 um 08:00 Uhr Berliner Zeit, danach wird die Planung entfernt – keine wiederkehrende Belastung.
- Keine Änderung an bestehenden Vorlagen, Dialogen oder anderen Brandings.
