# Speicher-Zugriffsregeln für die 6 Ordner einrichten

## Stand
- Alle 6 Speicherordner sind angelegt und öffentlich: `branding-logos`, `contract-documents`, `avatars`, `application-documents`, `chat-attachments`, `order-attachments`.
- Es fehlen noch die Zugriffsregeln (wer hochladen, ändern, löschen darf). Ohne sie schlagen Uploads weiter fehl.

## Schritt 1: Zugriffsregeln pro Ordner anlegen (Migration)
Pro Ordner Regeln auf `storage.objects`, jeweils für Lesen, Hochladen, Ändern, Löschen:

- **branding-logos**: Lesen für alle; Hochladen/Ändern/Löschen nur für angemeldete Admins.
- **avatars**: Lesen für alle; jeder angemeldete Nutzer darf nur in seinen eigenen Unterordner (`<user_id>/...`) hochladen/ändern/löschen; Admins überall.
- **contract-documents**: Lesen für alle (Vertrags-PDFs werden über öffentliche Links geöffnet); Hochladen/Ändern/Löschen für Admins und den Vertragsinhaber.
- **application-documents**: Lesen für alle (öffentliche Bewerbungsseiten laden Dokumente); Hochladen für alle (Bewerber laden ohne Konto hoch); Ändern/Löschen nur Admins.
- **chat-attachments**: Lesen für alle; Hochladen für alle (Gäste im Live-Chat ohne Konto); Ändern/Löschen nur Admins.
- **order-attachments**: Lesen für alle; Hochladen/Ändern für angemeldete Mitarbeiter und Admins; Löschen nur Admins.

## Schritt 2: Prüfen
- Logo-Upload auf `/admin/brandings` testen (soweit ohne Admin-Login möglich) bzw. Nutzer lädt ein Logo hoch.
- Keine E-Mails/SMS, keine Datenänderungen.

## Technische Details
- Eine Migration mit `CREATE POLICY ... ON storage.objects` pro Ordner und Aktion (`bucket_id = '<name>'`).
- Admin-Prüfung über `public.has_role(auth.uid(), 'admin')`.
- Pfad-Prüfung für Avatare über `(storage.foldername(name))[1] = auth.uid()::text`.
- Policies sind idempotent (`DROP POLICY IF EXISTS` vorher), damit sie bei Wiederholung nicht fehlschlagen.
