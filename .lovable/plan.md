# Mehrere Domains pro Branding

Aktuell hat jedes Branding genau ein Feld "Domain", und die Branding-Erkennung auf öffentlichen Seiten (Login `/auth`, Buchungsseite `/bewerbungsgespraech/buchen` bzw. `/buchen`) vergleicht den Host exakt mit diesem einen Wert (plus optional dem "Custom E-Mail Link"). Wird eine andere Domain auf die App gezeigt, greift der Fallback auf ein Standard-Branding.

## Ziel

Im Branding-Formular (Erstellen und Bearbeiten) können zusätzliche Domains hinterlegt werden. Alle dort eingetragenen Domains führen zur korrekten Branding-Erkennung.

## Was gebaut wird

1. **Datenbank**: Neues Feld `additional_domains` (Liste von Texten, Standard: leer) in der Tabelle `brandings`.
2. **Formular** (`/admin/brandings/neu` und `/admin/brandings/:id`): Unter dem bestehenden Domain-Feld ein Bereich "Weitere Domains" mit Chips/Zeilen zum Hinzufügen und Entfernen einzelner Domains. Eingaben werden normalisiert (ohne `https://`, ohne `www.`, ohne Slash am Ende, kleingeschrieben) und Duplikate verhindert.
3. **Erkennung**: Auf `/auth` und der öffentlichen Buchungsseite wird nach der exakten Prüfung der Haupt-Domain zusätzlich in den weiteren Domains gesucht (Host und Root-Domain), bevor der Custom-Link-Abgleich und der Fallback greifen.
4. **Übersicht** `/admin/brandings`: In der Domain-Spalte wird die Hauptdomain angezeigt, zusätzliche Domains als kleiner Hinweis (z. B. "+2").

## Unverändert

- Die Haupt-Domain bleibt maßgeblich für generierte Links (E-Mails, SMS, Kurzlinks) — daran ändert sich nichts.
- Der bestehende "Custom E-Mail Link" bleibt wie er ist.

## Technische Details

- Migration: `ALTER TABLE public.brandings ADD COLUMN additional_domains text[] NOT NULL DEFAULT '{}'` (bestehende RLS/Grants unverändert).
- `src/pages/admin/AdminBrandingForm.tsx`: Zod-Schema um `additional_domains: z.array(z.string())` erweitern, State + Add/Remove-UI, Wert bei Insert/Update mitschicken.
- `src/pages/Auth.tsx` und `src/pages/BewerbungsgespraechPublic.tsx`: Query um `additional_domains` erweitern; bei Nichttreffer der Hauptdomain ein Lookup mit `.overlaps("additional_domains", [host, root])` einbauen, sonst wie bisher weiter zum Custom-Link/Fallback.
- `src/pages/admin/AdminBrandings.tsx`: Anzeige der Zusatz-Domains in der Tabellenzelle.
