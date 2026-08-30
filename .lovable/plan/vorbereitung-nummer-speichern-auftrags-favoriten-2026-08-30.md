# Vorbereitung: Nummer speichern & Auftrags-Favoriten

Zwei kleine Erweiterungen am Vorbereitungs-Dialog in `/admin/erster-arbeitstag`.

## 1. Anosim-Nummer automatisch in Telefonnummern speichern

Beim Klick auf „Speichern" im `FirstWorkdayPrepDialog` (Feld „2. Telefonnummer"):

- Wenn Provider = `anosim` und eine URL eingetragen ist (nach der bestehenden `share → api/v1` Normalisierung), prüfen ob für das aktuelle `branding_id` bereits ein Eintrag in `phone_numbers` mit derselben `api_url` existiert.
- Wenn nicht: neuen Datensatz einfügen (`provider: "anosim"`, `api_url`, `branding_id`) — identisch zur `addMutation` in `AdminTelefonnummern.tsx`.
- SMSBot-Nummern werden nicht dupliziert (die kommen ohnehin per Proxy live).
- Fehler beim Anlegen der Telefonnummer soll das Speichern der Vorbereitung nicht blockieren (nur Warn-Toast).

Danach ist die Nummer sofort unter `/admin/telefonnummern` für das Branding sichtbar.

## 2. Aufträge favorisieren („Stern")

Im Auftrag-Dropdown (Step 1) sollen bestimmte Bankdrop-Aufträge oben angepinnt werden können.

- Neue Spalte `is_starred boolean not null default false` auf `public.orders`.
- Im Popover-Command hinter jedem Eintrag ein kleines Stern-Icon (klickbar, `stopPropagation`):
  - leerer Stern → gelb-gefüllter Stern nach Klick
  - toggelt `orders.is_starred` per `update` und invalidiert `bankdrop-orders` Query.
- Query in `FirstWorkdayPrepDialog` sortiert `is_starred desc, title asc`, sodass Favoriten oben stehen. Visuelle Trennung: nach dem letzten Favoriten ein feiner `border-t`.

Sichtbar nur im Admin-Panel — keine Auswirkung auf Mitarbeiter-Ansichten.

## Technisch

- Migration: `alter table public.orders add column is_starred boolean not null default false;`
- Kein neuer Grant/RLS nötig (bestehende Admin-Policies auf `orders` decken update ab).
- Datei-Änderungen: `src/components/admin/FirstWorkdayPrepDialog.tsx` (Save-Logik, Query-Sortierung, Stern-UI + Toggle-Mutation).
