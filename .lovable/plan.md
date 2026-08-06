# Dashboard: "Anstehende Probetag-Termine" durch "Anstehende 1. Arbeitstage" ersetzen

Auf `/admin` zeigt der Block aktuell Probetag-Termine (`trial_day_appointments`). Er wird durch anstehende Termine des 1. Arbeitstags ersetzt.

## Was sich ändert

- Überschrift: "Anstehende 1. Arbeitstage"
- Leerzustand: "Keine anstehenden 1. Arbeitstage."
- Karten zeigen weiterhin Name, Datum, Uhrzeit und Status-Badge
- Datenquelle: `first_workday_appointments` ab heute, aufsteigend nach Datum/Uhrzeit
- Branding-Filter über den verknüpften Arbeitsvertrag (`employment_contracts.branding_id`)
- Status-Badges passend zu den vorhandenen Werten: Neu, Erfolgreich, Fehlgeschlagen

Layout, Animation und Scrollbereich bleiben unverändert.

## Technisch

- `src/components/admin/UpcomingTrialDays.tsx` → neue Komponente `src/components/admin/UpcomingFirstWorkdays.tsx` (alte Datei entfällt)
- Query: `first_workday_appointments` mit Embed `employment_contracts:contract_id(first_name, last_name, branding_id)`; Branding-Filter clientseitig wie in `AdminErsterArbeitstag.tsx` (Left-Join)
- `src/pages/admin/AdminDashboard.tsx`: Import und Verwendung von `UpcomingTrialDays` durch die neue Komponente ersetzen
