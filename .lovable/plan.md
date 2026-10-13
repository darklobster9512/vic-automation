# Datenbank-CPU auf 99 % senken

## Ursache (geprüft)

1. **Nach der Wiederherstellung fehlen fast alle Such-Indizes.** Die Tabellen haben nur noch ihre Primärschlüssel. Für jede Abfrage nach Mitarbeiter, Branding oder Telefonnummer muss die Datenbank deshalb die ganze Tabelle durchlesen.
2. **Die Datenbank kennt ihre eigenen Tabellengrößen nicht.** Nach dem Einspielen des Backups wurde keine Statistik erstellt (überall "0 Zeilen" eingetragen). Darum wählt sie sehr langsame Abfragewege.
3. **Die teuersten Abfragen laufen dauernd:**
   - Ungelesene Chat-Nachrichten (Livechat/Sidebar-Zähler): 155 Aufrufe, im Schnitt 1,6 s, bis 7,8 s
   - Offene Auftragszuweisungen pro Mitarbeiter: im Schnitt 1,2 s
   - Chat-Übersicht und Autosave der Bewertungs-Entwürfe: je über 1 s
   - Ident-Sessions: über 6.300 komplette Tabellen-Durchläufe, vor allem durch den SMS-Watcher, der jede Minute 4 Durchläufe macht

## Lösung

1. Statistik für alle Tabellen neu erstellen (ANALYZE).
2. Fehlende Indizes für die häufigsten Suchfelder anlegen.
3. Danach die Abfragezeiten erneut messen und prüfen, ob die CPU sinkt.

Es werden keine Daten geändert und keine Nachrichten verschickt.

## Technische Details

Migration mit `CREATE INDEX IF NOT EXISTS`:
- `chat_messages (contract_id, sender_role, read)`
- `order_assignments (contract_id, status)`, `order_assignments (status)`
- `employment_contracts (user_id)`, `(branding_id)`, `(application_id)` existiert
- `applications (branding_id, status)`, `applications (lower(email))`, `applications (phone)`
- `interview_appointments (appointment_date, appointment_time)`, `(slot_index)`
- `first_workday_appointments (contract_id)`, `(application_id)`, `(appointment_date, appointment_time)`
- `trial_day_appointments (application_id)`
- `ident_sessions (phone_api_url, updated_at desc)`, `(contract_id)`, `(order_id)`, `(status)`
- `orders (branding_id)`, `kunde_brandings (user_id)`, `user_roles (user_id)`
- `order_reviews (contract_id)`, `(order_id)`, `order_attachments (order_id, contract_id)`
- `email_queue (status, next_attempt_at)`, `email_logs (event_type)`, `sms_logs (event_type)`
- `sms_inbox_seen (created_at)`

Anschließend `ANALYZE;` über die gesamte Datenbank und Kontrolle mit `slow_queries` / `EXPLAIN`.
