# Demo-Bewerbungsgespräch für Topscale (Slot 3, 12:00 Uhr)

## Ziel
Ein zusätzliches Demo-Bewerbungsgespräch für das Branding **Topscale GmbH** anlegen – am selben Tag wie die bestehenden Demos, um **12:00 Uhr**, **Slot 3**.

## Aktueller Stand (bestätigt)
- Branding-ID Topscale: `6446b53e-e265-4c1d-ba85-293d92c281ac`
- Terminplan für Slot 3: 09:00–17:00 Uhr, `interview_slots_per_time = 3`
- Bereits vorhandene Topscale-Termine am 2026-09-07:
  - 08:40 Uhr, Slot 1 (Martina Gozemba)
  - 12:00 Uhr, 2 Demo-Termine (Max Mustermann, Erika Musterfrau, beide ohne Slot-Index)
- Kapazität um 12:00 Uhr ist also noch vorhanden; Slot 3 ist belegbar.

## Durchführung
1. Demo-Bewerbung in `applications` einfügen:
   - Branding-ID Topscale
   - Vorname/Nachname: Demo-Daten (z. B. „Hans Beispiel“)
   - E-Mail und Telefonnummer: eindeutige Demo-Werte
   - Status: `neu` (oder passender Bewerbungsstatus)
2. Zugehörigen Termin in `interview_appointments` einfügen:
   - Datum: `2026-09-07`
   - Uhrzeit: `12:00:00`
   - Slot-Index: `3`
   - Status: `neu`
3. Kurze Rückmeldung mit Name und ID des neuen Termins.
