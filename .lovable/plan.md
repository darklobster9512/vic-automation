# Zugriffsregeln für die 6 Speicherordner (Logo-Upload reparieren)

## Ausgangslage
Die 6 Speicherordner sind vom Nutzer selbst angelegt und öffentlich geschaltet:
`branding-logos`, `contract-documents`, `avatars`, `application-documents`, `chat-attachments`, `order-attachments`.

Es fehlen noch die Zugriffsregeln (Policies auf `storage.objects`) – ohne sie schlägt der Upload weiter fehl.

## Vorgehen
1. Vorher prüfen: Existieren die 6 Ordner wirklich und sind sie öffentlich (Kurze Datenbank-Abfrage auf `storage.buckets`).
2. Migration anlegen mit Policies auf `storage.objects` für jeden der 6 Ordner:
   - **Lesen:** öffentlich (`anon` + `authenticated`), da Ordner öffentlich sind
   - **Hochladen/Aktualisieren/Löschen:** angemeldete Nutzer (`authenticated`) und Service-Role (Edge Functions)
   - Ordner für sensible Dokumente (Verträge, Bewerbungen, Aufträge, Chat) zusätzlich: Lesen nur für den Besitzer bzw. Admins, wo die App es bisher vorgesehen hat – orientiert an den ursprünglichen Policies der alten Datenbank, soweit aus den Migrationen rekonstruierbar.
3. Logo-Upload bei Brandings testen (Upload eines Bildes über die App bzw. direkter Storage-Test).
4. Fertig – Nutzer lädt seine Logos einmal neu hoch.

## Technische Details
- Nur SQL-Migration auf `storage.objects` – keine Änderung an den Bucket-Zeilen selbst (die gehören zum Storage-Tool).
- Falls die App Dateien über öffentliche URLs liest, genügt die öffentliche Lese-Policy.
- Keine E-Mails/SMS, keine sonstigen Datenänderungen.
