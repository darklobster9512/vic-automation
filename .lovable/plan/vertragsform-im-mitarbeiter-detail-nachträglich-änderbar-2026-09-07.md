# Vertragsform im Mitarbeiter-Detail nachträglich änderbar

## Was gebaut wird

Auf der Mitarbeiter-Detailseite (`/admin/mitarbeiter/:id`) wird die Zeile "Vertragsform" bearbeitbar:

- Ein Stift-Symbol öffnet eine Auswahl aller aktiven Vertragsvorlagen des Brandings dieses Mitarbeiters (z. B. Minijob 5h / 603 €, Teilzeit 10h / 20h / 25h) mit Stunden und Gehalt in der Beschriftung.
- Nach dem Speichern zeigt die Seite sofort die neue Vertragsform, und das Gehalt im Mitarbeiter-Panel richtet sich automatisch nach der neuen Vorlage.
- Die Zeile erscheint künftig auch, wenn noch keine Vorlage zugewiesen ist ("Keine Vorlage zugewiesen") — so kann man sie auch nachträglich erstmalig setzen.
- Es werden dabei keine SMS oder E-Mails verschickt.

Hinweis: Ein bereits erzeugtes bzw. unterschriebenes Vertrags-PDF bleibt unverändert; geändert wird die zugewiesene Vorlage (und damit Gehalt/Stunden in der Anzeige).

## Technische Details

- `src/pages/admin/AdminMitarbeiterDetail.tsx`: statischer "Vertragsform"-Block wird durch eine kleine Komponente mit `Select` ersetzt.
- Vorlagen laden per React Query: `contract_templates` gefiltert auf `branding_id = contract.branding_id` und `is_active = true`, sortiert nach `salary`.
- Speichern über den vorhandenen `saveFields`-Pfad bzw. ein `update({ template_id })` auf `employment_contracts`, danach `invalidateAll()`.
- Optional mitgeführt: `employment_type` wird auf den Typ der gewählten Vorlage gesetzt, damit Anzeige und Vorlage konsistent bleiben.
- Keine Datenbankänderung nötig (Spalte `template_id` existiert, Admin-Update-Policy vorhanden).
