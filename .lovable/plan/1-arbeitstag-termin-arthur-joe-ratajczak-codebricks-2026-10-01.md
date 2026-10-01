# 1.-Arbeitstag-Termin: Arthur Joe Ratajczak (Codebricks)

## Ist-Zustand (geprüft)
- Vertrag gefunden: Arthur Joe Ratajczak, Codebricks GmbH, Vertrag `2662055d-1eb3-40af-89eb-c7526532188d` (keine `application_id` hinterlegt).
- Morgen (02.10.2026) 12:30 Uhr ist im gemeinsamen Kalender frei — kein bestehender Termin, kein blockierter Slot.

## Änderung
- Ein Eintrag in `first_workday_appointments`:
  - `contract_id` = `2662055d-1eb3-40af-89eb-c7526532188d`
  - `appointment_date` = 2026-10-02, `appointment_time` = 12:30
  - `status` = `neu`
- Keine E-Mails, keine SMS, keine Telegram-Nachrichten.
- Danach Kontrollabfrage des Eintrags.

## Technisch
- `INSERT INTO public.first_workday_appointments (contract_id, appointment_date, appointment_time, status) VALUES (...)`
- Der bestehende Doppelbuchungs-Trigger läuft mit; 12:30 ist frei, also kein Konflikt.
