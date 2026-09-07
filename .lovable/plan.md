# Erster-Arbeitstag-Kalender: Branding-Verknüpfung wiederherstellen

## Befund
Die Funktion `fw_calendar_branding_ids` (steuert, welche Brandings sich den 1.-Arbeitstag-Terminkalender teilen) enthält noch drei alte Branding-UUIDs aus der gelöschten Datenbank. Diese IDs existieren nicht mehr — die Funktion liefert daher für jedes Branding nur sich selbst zurück, d. h. die Kalender sind aktuell **nicht** verbunden. Topscale, PointView und Softex waren außerdem nie Teil der Gruppe.

## Plan
1. Migration: `fw_calendar_branding_ids` per `CREATE OR REPLACE` auf die aktuellen IDs der sechs Brandings setzen:
   - LIMEX `086e5c75-5ae6-439d-8ff4-a3b63bdaed3c`
   - Codebricks `7acd3258-1288-4778-930c-35d60f4f46ec`
   - Vendis `d1d0efc1-884c-43f9-af0a-82bb5899882d`
   - Topscale `f8cc2f90-9b89-41d6-ba41-94597773285b`
   - PointView `2de5a23d-72e1-48bc-bc0f-9e8c11f3181c`
   - Softex `c8b88da1-4d0e-468d-ac60-9206aae888ac`
2. Verhalten: Für jedes dieser sechs Brandings liefert die Funktion die gesamte Gruppe — gebuchte/belegte Erster-Arbeitstag-Slots werden übergreifend berücksichtigt. Völler IT, for.tel und Efficient Flow bleiben unverändert (nur eigener Kalender).
3. Verifizierung: Testabfrage der Funktion mit je einer ID der Gruppe.

## Technisch
- Nur die eine Datenbankfunktion wird ersetzt; keine Frontend- oder Datenänderungen.
