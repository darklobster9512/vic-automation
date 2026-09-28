# Logo-Upload reparieren

## Ursache (geprüft)
Die neue Datenbank hat **keinen einzigen Speicherordner**. Der Ordner für Logos (`branding-logos`) fehlt, deshalb scheitert jeder Upload. Genauso betroffen sind Verträge, Profilbilder, Bewerbungsunterlagen, Chat- und Auftrags-Anhänge.

## Umsetzung
1. Die 6 Speicherordner anlegen: `branding-logos`, `contract-documents`, `avatars`, `application-documents`, `chat-attachments`, `order-attachments` (öffentlich, wie in der alten Datenbank).
2. Die Zugriffsregeln für diese Ordner aus den gespeicherten Migrationen erneut einspielen (Admins/Kunden dürfen Logos hochladen, Mitarbeiter ihre eigenen Dateien usw.).
3. Prüfen, dass alle Ordner und Regeln vorhanden sind.

## Falls blockiert
Wenn deine Arbeitsbereich-Einstellung öffentliche Ordner weiterhin verbietet, schlägt Schritt 1 fehl. Dann musst du unter **Settings → Privacy & Security** öffentliche Speicherordner erlauben (nur Admin/Besitzer) – danach lege ich sie sofort an.

## Hinweis
Alte Logos aus dem Backup zeigen weiter auf die gelöschte Datenbank. Nach der Reparatur musst du die Logos einmal neu hochladen.
