# Statistiken-Seite (/admin/statistiken)

Neue Auswertungsseite im Admin-Bereich, gefiltert auf das aktuell gewählte Branding, mit umschaltbarem Zeitraum.

## Navigation
- Neuer Sidebar-Eintrag "Statistiken" (Gruppe "Übersicht", direkt unter "Übersicht", Icon: BarChart3)
- Neue Route `/admin/statistiken`
- Für Kunden sichtbar (keine Aufnahme in KUNDE_HIDDEN_PATHS), für Caller wie üblich über Berechtigungen geregelt

## Zeitraum-Umschalter
Buttons oben: Heute, Gestern, Letzte 7 Tage, Letzte 30 Tage, Dieser Monat, Letzter Monat, Benutzerdefiniert (Datumsbereich). Alle Kacheln und Tabellen reagieren auf die Auswahl.

## Inhalte

1. KPI-Kacheln (Summen im Zeitraum)
   - Bewerbungen, davon akzeptiert (%), davon Termin gebucht (%)
   - Bewerbungsgespräche, erfolgreich (%), fehlgeschlagen (%)
   - 1.-Arbeitstag-Termine, erfolgreich (%)
   - Neue Accounts
   - Eingereichte Arbeitsverträge

2. Bewerbungen pro Tag
   Tabelle + Balkendiagramm: Datum, Eingegangen, Akzeptiert, Termin gebucht, Quoten in %.

3. Bewerbungsgespräche pro Tag
   Tabelle: Datum, Gesamt, Erfolgreich, Fehlgeschlagen, Mailbox, Offen, Erfolgsquote %.

4. Slot-Vergleich (Caller-Performance)
   Tabelle je Slot (1..n): Termine, Erfolgreich, Fehlgeschlagen, Mailbox, Erfolgsquote %, plus Anteil an Gesamtterminen. Zusätzlich eine Kreuztabelle Tag × Slot für den Trend.

5. 1. Arbeitstag pro Tag
   Datum, Termine, Erfolgreich, Fehlgeschlagen, Offen, Erfolgsquote %.

6. Funnel-Ansicht
   Bewerbung → Akzeptiert → Termin gebucht → Gespräch erfolgreich → Account → Vertrag eingereicht, jeweils mit Conversion in %.

7. Accounts & Verträge pro Tag
   Tabelle: Datum, neue Accounts, eingereichte Verträge.

## Technische Umsetzung
- Neue Datei `src/pages/admin/Statistiken.tsx`, Route in `src/App.tsx`, Eintrag in `src/components/admin/AdminSidebar.tsx`.
- Daten über bestehende Tabellen, jeweils gefiltert auf `activeBrandingId` (`useBrandingFilter`):
  - `applications`: `created_at` (Eingang), `status` (akzeptiert = alles außer `neu`/`abgelehnt`; Termin gebucht = `termin_gebucht`/`erfolgreich` bzw. vorhandener Interview-Termin)
  - `interview_appointments` join `applications` (branding): `appointment_date`, `status`
  - Slot-Zuordnung über RPC `resolved_interview_slots_for_branding` (berücksichtigt manuelle und automatische Slots), gemappt auf die Termin-IDs
  - `first_workday_appointments` join `employment_contracts` (branding): `appointment_date`, `status`
  - Accounts: `profiles.created_at` mit `branding_id`
  - Verträge: `employment_contracts.submitted_at` mit `branding_id`
- Zeilenlimit von 1000 wird über `.range()`-Batchschleifen umgangen (bestehendes Projektmuster).
- Aggregation im Frontend nach Tag (Europe/Berlin-Datum), Darstellung mit vorhandenen shadcn-Karten/Tabellen und recharts für die Balken-/Liniendiagramme.
- Premium-Card-Layout wie in den übrigen Admin-Seiten, Ladezustände mit Skeletons.

## Hinweis zur Datenlage
Für "akzeptiert" gibt es kein eigenes Zeitstempel-Feld — die Zuordnung erfolgt über das Eingangsdatum der Bewerbung (Kohortensicht: "von den an Tag X eingegangenen Bewerbungen wurden N akzeptiert"). Das ist für den Tagesvergleich die aussagekräftigste Variante; ein separates Feld `accepted_at` könnte später ergänzt werden, falls die exakte Aktionszeit benötigt wird.
