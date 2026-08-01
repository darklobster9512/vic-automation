## Ziel

Auf `/admin/bewerbungsgespraeche`:
1. Beim Markieren als **Erfolgreich** öffnet sich ein Dialog mit optionalem Notizfeld.
2. Ein Klick auf das **Status-Badge** (Erfolgreich / Fehlgeschlagen) öffnet ein Popup mit der dazu hinterlegten Notiz.

## Teil 1 — Notiz-Dialog beim Erfolgreich-Markieren

- Der grüne Haken setzt den Status nicht mehr sofort, sondern öffnet den Dialog „Gespräch erfolgreich".
- Der Dialog zeigt den Bewerbernamen und ein Textfeld „Notiz (optional)…".
- **Abbrechen** → keine Änderung. **Bestätigen** → Status wird auf erfolgreich gesetzt, auch ohne Notiz.
- Ist eine Notiz eingetragen, wird sie wie beim Fehlgeschlagen-Dialog als Branding-Notiz gespeichert (Kontext `bewerbungsgespraeche`, Autor = eingeloggte Admin-E-Mail, Inhalt `Vorname Nachname — Erfolgreich: <Notiz>`).
- E-Mail-Verhalten bleibt unverändert (kein Versand beim Genehmigen).

## Teil 2 — Notiz per Klick auf den Status anzeigen

- Die Status-Badges für Erfolgreich und Fehlgeschlagen werden klickbar (Cursor-Pointer, leichter Hover).
- Klick öffnet ein Popover/Dialog „Notiz zum Gespräch" mit:
  - Notiztext (ohne den Namens-/Status-Präfix), Autor und Zeitstempel
  - Mehrere Notizen zum selben Bewerber werden untereinander gelistet (neueste zuerst)
  - Falls keine vorhanden: Hinweis „Keine Notiz hinterlegt"
- Status „Neu" bleibt nicht klickbar.

## Technisch

- Datei: `src/pages/admin/AdminBewerbungsgespraeche.tsx`
- Neue States `successTarget` / `successNote` analog `failTarget` / `failReason`; neuer Dialog neben dem bestehenden Fehlgeschlagen-Dialog.
- Notizen-Zuordnung: Es gibt in `branding_notes` keine Termin-Referenz, nur `content` mit Präfix `Vorname Nachname — Erfolgreich:` bzw. `— Fehlgeschlagen:`. Deshalb:
  - Neue Query `interview-notes`: `branding_notes` mit `page_context = 'bewerbungsgespraeche'`, sortiert nach `created_at desc`.
  - Zuordnung im Frontend über den Präfix `${first_name} ${last_name} — ` + Statuswort; Anzeige des Textes nach dem Doppelpunkt.
  - Nach dem Anlegen einer Notiz wird zusätzlich `interview-notes` invalidiert.
- Keine Datenbankänderung nötig.
