# Bewertungen als Entwurf speichern

Mitarbeiter können eine Bewertung unterbrechen und später mit dem letzten Stand fortsetzen.

## Was der Mitarbeiter sieht

- Auf der Bewertungsseite gibt es neben "Bewertung abschicken" einen zweiten Button "Als Entwurf speichern".
- Eingaben (Sterne + Kommentare) werden zusätzlich automatisch alle paar Sekunden im Hintergrund gesichert, mit kleinem Hinweis "Zuletzt gespeichert: HH:MM".
- Beim erneuten Öffnen der Bewertung ist der letzte Stand vorausgefüllt, plus Hinweis "Entwurf wiederhergestellt".
- Ein Entwurf darf unvollständig sein (keine Pflichtfelder). Für das endgültige Abschicken gelten die bisherigen Regeln unverändert.
- In der Auftragsübersicht/den Auftragskarten bekommt ein Auftrag mit gespeichertem Entwurf ein Badge "Entwurf".
- Nach erfolgreichem Abschicken wird der Entwurf entfernt.

## Technische Umsetzung

Neue Tabelle `public.order_review_drafts`:
- `id`, `order_id`, `contract_id`, `answers jsonb` (Array aus `{rating, comment}`), `updated_at`
- Unique Constraint auf (`order_id`, `contract_id`) für Upsert
- GRANTs für `authenticated` (select/insert/update/delete) und `service_role`; RLS: Mitarbeiter darf nur Zeilen zu eigenen Verträgen lesen/schreiben (über bestehende Hilfsfunktion analog zu `order_reviews`-Policies), Admins Vollzugriff

Frontend (`src/pages/mitarbeiter/Bewertung.tsx`):
- Beim Laden des Auftrags parallel den Entwurf laden und `answers` daraus initialisieren (Länge an Fragenanzahl angleichen)
- Debounced Autosave (ca. 2 s nach letzter Änderung) per Upsert, plus manueller Button
- Nach erfolgreichem Insert der Reviews Entwurf löschen

Badge-Anzeige: in `MitarbeiterAuftraege.tsx` / `AuftragDetails.tsx` die vorhandenen Entwürfe des Mitarbeiters mitladen und als Badge anzeigen.

Es werden keine SMS, E-Mails oder Telegram-Nachrichten durch Entwürfe ausgelöst.
