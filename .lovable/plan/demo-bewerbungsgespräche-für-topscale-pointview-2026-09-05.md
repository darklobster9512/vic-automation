# Demo-Bewerbungsgespräche für Topscale & PointView

## Ziel
Für die Brandings **Topscale GmbH** (`topscale.gmbh`) und **PointView GmbH** (`pointview.gmbh`) jeweils 2 Demo-Bewerbungsgespräche um **12:00 Uhr** mit Demo-Daten anlegen.

## Vorgehen
1. Pro Branding 2 Demo-Bewerbungen in `applications` anlegen:
   - Topscale: z. B. „Max Mustermann" / „Erika Musterfrau" mit Demo-E-Mail (`demo1@topscale.gmbh` etc.), Demo-Telefonnummer, Status `accepted` (damit sie als angenommen gelten).
   - PointView: analog mit `demo1@pointview.gmbh` / `demo2@pointview.gmbh`.
2. Pro Bewerbung einen Termin in `interview_appointments` eintragen:
   - Datum: nächster Werktag (Mo, 07.09.2026)
   - Uhrzeit: 12:00
   - Status: `gebucht`
3. Prüfung: Beide Termine erscheinen anschließend unter `/admin/bewerbungsgespraeche` im jeweiligen Branding.

## Hinweise
- Reine Datenänderung, keine Code-Änderung.
- Demo-Daten sind klar als solche erkennbar (demo-E-Mails, Muster-Namen).
