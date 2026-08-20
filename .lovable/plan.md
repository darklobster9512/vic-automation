# Vorbereitung & Start für 1. Arbeitstag-Termine

Auf `/admin/erster-arbeitstag` kommen in der Spalte „Aktionen" zwei neue Buttons dazu: **Vorbereitung** (Clipboard-Icon) und **Starten** (Play-Icon).

## Vorbereitung (intern, Mitarbeiter merkt nichts)

Popup in zwei Schritten:

1. **Auftrag wählen** — Dropdown mit allen Bankdrop-Aufträgen des aktiven Brandings (Titel, Anbieter, Auftragsnummer).
2. **Ident vorbereiten** — genau wie auf der Ident-Detailseite:
   - Nummer wählen (Anosim-Nummern und SMSBot-Rentals des Brandings, mit angezeigter Rufnummer)
   - Ident-Eingabefelder (Identcode, Identlink, Anmeldename, Email, Passwort, eigene Felder ergänzbar)
   - Info-Vorlage auswählen (bestehende Ident-Info-Vorlagen des Brandings) und Text frei bearbeiten

„Speichern" legt die Vorbereitung nur intern ab. Es wird **kein** Auftrag zugewiesen, keine Ident-Session erzeugt, keine SMS/E-Mail verschickt. Beim erneuten Öffnen ist alles wieder vorbefüllt und änderbar. Ein Badge in der Zeile zeigt „Vorbereitet".

## Starten (Play)

Popup zeigt die Zusammenfassung: Mitarbeiter, gewählter Auftrag, Rufnummer, alle Ident-Felder, Info-Text. Nach „Jetzt starten":

1. Auftrag wird dem Mitarbeiter zugewiesen (`order_assignments`) — inkl. der normalen Zuweisungs-E-Mail und -SMS.
2. Ident-Session wird direkt mit Nummer, Ident-Daten und Info-Text angelegt, Status „Daten gesendet" — inkl. der üblichen Ident-Daten-SMS.
3. Vorbereitung wird als „gestartet" markiert; die Zeile zeigt ein „Gestartet"-Badge, der Play-Button ist danach deaktiviert.

Wenn der Auftrag schon zugewiesen ist, wird nicht doppelt zugewiesen und keine zweite Zuweisungs-Mail verschickt.

## Technische Umsetzung

- Neue Tabelle `public.first_workday_preparations`: `id`, `appointment_id` (unique, FK auf `first_workday_appointments`), `contract_id`, `order_id`, `branding_id`, `phone_api_url`, `test_data jsonb`, `info_notes`, `status` (`prepared` | `started`), `started_at`, `created_by`, `created_at`, `updated_at`.
  GRANTs für `authenticated` und `service_role`, RLS aktiviert, Policies: Admins alles, `kunde` nur für eigene Brandings via `user_branding_ids`. Kein Zugriff für die `user`-Rolle → Mitarbeiter sehen nichts. `updated_at`-Trigger wie bei `ident_info_templates`.
- Neue Komponente `src/components/admin/FirstWorkdayPrepDialog.tsx`: Auftrag-Select (`orders` gefiltert auf `order_type = 'bankdrop'` + aktives Branding), Nummernauswahl (`phone_numbers` + `smsbot-proxy` Liste, `smsbot://<rentalId>`-Format wie in `AdminIdentDetail`), Ident-Felder, Vorlagen-Select über `useIdentInfoTemplates`.
- Neue Komponente `src/components/admin/FirstWorkdayStartDialog.tsx`: Zusammenfassung + Bestätigung; legt `order_assignments`-Zeile an, ruft `notifyOrdersAssigned` (wie `AssignmentDialog`) und erstellt danach die `ident_sessions`-Zeile (`status: 'data_sent'`, `assignment_id`, `phone_api_url`, `test_data`, `info_notes`, `branding_id`) inkl. der Ident-SMS analog zum Speichern in `AdminIdentDetail`.
- `src/pages/admin/AdminErsterArbeitstag.tsx`: zwei Icon-Buttons in der Aktionen-Spalte, Query der Vorbereitungen für die sichtbaren Termine, Badges „Vorbereitet"/„Gestartet".
