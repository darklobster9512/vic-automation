# Alle restlichen Verweise auf die alte Datenbank umstellen

## Befund (geprüft)
- **Code:** Keine Stelle mehr mit der alten Adresse – die Buchungsseiten, das Favicon-Skript, Mitarbeiter-Konto-Anlage und Vertragsunterschrift sind bereits umgestellt.
- **Gespeicherte Daten:** 815 Einträge zeigen noch auf den Speicher der alten Datenbank (`gzgfyuftjvezqjkosntu`):

| Bereich | Anzahl |
|---|---|
| Chat-Anhänge | 288 |
| Auftrags-Anhänge (Screenshots etc.) | 192 |
| Ausweis Vorderseite | 125 |
| Ausweis Rückseite | 118 |
| Support-Ticket-Anhänge | 41 |
| Branding-Bilder (Logo, Favicon, Chat-Avatar, PM-/Recruiter-Foto, Unterschrift) | 32 |
| Meldebescheinigungen | 7 |
| Profilbilder | 2 |

- **Wichtig:** Keine einzige dieser Dateien liegt im neuen Speicher (0 von 815 geprüft). Die Dateien sind mit der alten Datenbank gelöscht worden.

## Änderung
- Einmaliges Daten-Update: In allen genannten Feldern wird die alte Adresse durch die neue (`dgkailowvrbugapykyan`) ersetzt. Pfad und Dateiname bleiben gleich.
- Keine E-Mails, SMS oder sonstige Benachrichtigungen.
- Kontrollabfrage danach: 0 Einträge mit alter Adresse.

## Was das bewirkt – und was nicht
- Es gibt danach keinen einzigen Verweis mehr auf die alte Datenbank.
- Die Bilder/Dokumente werden trotzdem **nicht** wieder angezeigt, weil die Dateien selbst nicht mehr existieren. Falls du die Originaldateien irgendwo noch hast (Download, anderes Backup), können sie unter demselben Namen in den neuen Speicher hochgeladen werden – dann erscheinen sie automatisch wieder.
- Branding-Bilder (LIMEX, PointView, Völler IT, Softex, Topscale) bitte unter Brandings neu hochladen. Ausweise/Meldebescheinigungen müssten betroffene Mitarbeiter bei Bedarf neu einreichen.

## Technische Details
- `UPDATE ... SET col = replace(col, 'gzgfyuftjvezqjkosntu.supabase.co', 'dgkailowvrbugapykyan.supabase.co') WHERE col LIKE '%gzgfyuftjvezqjkosntu%'` für: `chat_messages.attachment_url`, `order_attachments.file_url`, `employment_contracts.id_front_url/id_back_url/proof_of_address_url`, `support_ticket_messages.attachment_url`, `brandings` (6 Bildspalten), `profiles.avatar_url`.
- Vorher prüfen, dass kein Update-Trigger auf diesen Tabellen Benachrichtigungen auslöst.
