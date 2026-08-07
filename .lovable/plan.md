# Vorlagensystem für das Info-Feld bei Ident-Sessions

Beim Feld „Info / Fragen und Antworten (optional)" auf `/admin/idents/:id` kommt ein Vorlagen-Dropdown dazu: Vorlage auswählen → Text wird ins Feld übernommen. Vorlagen können angelegt, bearbeitet und gelöscht werden.

## Funktionsweise

- Über dem Textfeld eine Zeile mit Dropdown „Vorlage wählen" und einem Button „Vorlagen verwalten".
- Auswahl einer Vorlage setzt den Inhalt des Textfelds (Text bleibt danach frei editierbar, gespeichert wird wie bisher in der Ident-Session).
- Wenn bereits Text im Feld steht, kurze Rückfrage, ob überschrieben werden soll.
- Verwalten-Dialog: Liste der Vorlagen mit Name + Textvorschau, Bearbeiten, Löschen, sowie Formular zum Anlegen (Name + Text).
- Vorlagen sind pro Branding getrennt (wie die restlichen Admin-Daten), Admins sehen die des aktiven Brandings.

## Startvorlage

Eine Vorlage „Demo-WebID" wird direkt mit angelegt (für die bestehenden Brandings) mit dem vom Nutzer gelieferten Text zu Demo-WebID-Link, SMS-Code im Testdaten-Feld sowie den beiden Fragen/Antworten (Freiwilligkeit und Zweck der Identifizierung bei der DKB AG).

## Technische Umsetzung

- Neue Tabelle `public.ident_info_templates` (`id`, `branding_id`, `name`, `content`, `created_by`, `created_at`, `updated_at`) inkl. GRANTs für `authenticated`/`service_role`, RLS aktiviert.
- RLS-Policies analog zu bestehenden Branding-Tabellen (z. B. `chat_templates`): Admins alles, `kunde` nur für eigene Brandings via `user_branding_ids`.
- Seed-Insert der „Demo-WebID"-Vorlage je Branding in derselben Migration.
- `src/pages/admin/AdminIdentDetail.tsx`: Dropdown (shadcn `Select`) + Verwalten-Dialog über dem Textarea, Daten via React Query, gefiltert mit `useBrandingFilter`.
- Neue Komponente `src/components/admin/IdentInfoTemplateManager.tsx` für den Verwaltungs-Dialog (Create/Update/Delete), Styling im bestehenden Admin-Premium-Look.
