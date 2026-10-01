# Nachträglicher 1.-Arbeitstag-Termin: Julian Hauer (Codebricks)

## Ist-Zustand (geprüft)
- Vertrag gefunden: Julian Hauer, Codebricks GmbH, Vertrag `d433e15f-a45b-416e-b8ae-420aea2c5a41`, Bewerbung `292b1392-2185-4d7e-9ce5-1151875bf05b`.
- Heute (01.10.2026) 08:30 Uhr ist im gemeinsamen Kalender bereits belegt (Frankie Heinze, Vendis) — die Doppelbuchungs-Sperre würde 08:30 ablehnen.
- 08:40 Uhr ist frei und nicht blockiert (geprüft gegen Termine und `first_workday_blocked_slots` der Kalender-Gruppe).

## Änderung
- Ein Eintrag in `first_workday_appointments`:
  - `contract_id` = `d433e15f-a45b-416e-b8ae-420aea2c5a41`
  - `application_id` = `292b1392-2185-4d7e-9ce5-1151875bf05b`
  - `appointment_date` = 2026-10-01, `appointment_time` = 08:40
  - `status` = `neu`
- Keine E-Mails, keine SMS, keine Telegram-Nachrichten.
- Danach Kontrollabfrage des Eintrags.

## Technisch
- `INSERT INTO public.first_workday_appointments (contract_id, application_id, appointment_date, appointment_time, status) VALUES (...)`
- Der bestehende Doppelbuchungs-Trigger läuft mit; 08:40 ist frei, also kein Konflikt.
