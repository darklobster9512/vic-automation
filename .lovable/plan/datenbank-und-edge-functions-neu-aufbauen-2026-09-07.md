# Datenbank und Edge Functions neu aufbauen

Die gelöschte Datenbank lässt sich fast vollständig rekonstruieren: Im Projekt liegen noch alle 192 Migrationsdateien (die komplette Entwicklungshistorie der Datenbank) sowie der Quellcode aller 29 Edge Functions. Damit lässt sich die **Struktur** exakt wiederherstellen.

Wichtig vorab: **Die Inhalte (Bewerbungen, Verträge, Mitarbeiter, Chats, Logs, hochgeladene Dateien) sind nicht wiederherstellbar** – Migrationen enthalten nur den Aufbau, nicht die Daten. Auch Benutzerkonten und Passwörter sind weg. Wenn es ein Backup der alten Datenbank gibt, ist das der einzige Weg zurück zu den Daten.

## Ausgangslage

- Aktuell verbunden ist das Supabase-Projekt `gzgfyuftjvezqjkosntu` – es ist erreichbar, aber komplett leer (keine Tabellen, keine Funktionen, keine Speicher-Ordner).
- Die App selbst zeigt noch auf ein drittes, nicht mehr existierendes Projekt (`laozv...`) – daher die Endlos-Weiterleitung auf `/auth`.
- Alle bisher gesetzten Zugangsschlüssel (Telegram, seven.io, SMS, Lovable AI usw.) sind noch vorhanden.

## Schritt 0 – Verbindung sauber setzen (durch dich)

Über den Supabase-Button oben rechts das Projekt trennen und `vicsystem` neu verbinden, damit die App wieder auf die richtige Datenbank zeigt. Erst danach ergibt der Wiederaufbau Sinn.

## Schritt 1 – Datenbankstruktur wiederherstellen

Die gesamte Migrationshistorie wird in der ursprünglichen Reihenfolge erneut eingespielt, aufgeteilt in mehrere Blöcke (jeder Block wird dir zur Freigabe angezeigt):

1. Rollen-Typ und Basistabellen (Profile, Benutzerrollen, Brandings)
2. Recruiting (Bewerbungen, Gesprächstermine, Probetage, 1. Arbeitstag, Zeitpläne, Sperrzeiten)
3. Verträge und Vorlagen (Arbeitsverträge, Vertragsvorlagen, Unterschriften)
4. Betrieb (Aufträge, Zuweisungen, Anhänge, Bewertungen, Idents, Ident-Vorlagen)
5. Kommunikation (Livechat, E-Mail-Warteschlange und -Logs, SMS-Vorlagen/-Logs/-Spoof, Telegram, Telefonnummern, Shortlinks, WebID-Logs)
6. Alle Datenbankfunktionen, Trigger, Zugriffsregeln und Realtime-Einstellungen

Insgesamt entstehen dabei wieder 43 Tabellen inklusive aller Zugriffsregeln (Admin, Kunde, Mitarbeiter, Caller) genau wie vorher.

## Schritt 2 – Dateiablagen wiederherstellen

Sechs öffentliche Speicherordner werden neu angelegt: `branding-logos`, `avatars`, `application-documents`, `contract-documents`, `chat-attachments`, `order-attachments` – jeweils mit den zugehörigen Zugriffsregeln. Die früher hochgeladenen Dateien selbst sind verloren.

## Schritt 3 – Edge Functions neu ausrollen

Alle 29 Funktionen werden aus dem vorhandenen Quellcode neu veröffentlicht (u. a. `send-email`, `send-sms`, `sms-inbox-watch`, `anosim-proxy`, `smsbot-proxy`, `submit-application`, `sign-contract`, `caller-api`, `webid-redirect-watch`). Anschließend wird geprüft, ob alle benötigten Schlüssel im neuen Projekt hinterlegt sind.

## Schritt 4 – Grundausstattung zum Weiterarbeiten

Damit du dich überhaupt wieder einloggen kannst:

- Ein Admin-Konto anlegen (E-Mail/Passwort nennst du mir) und ihm die Admin-Rolle geben.
- Optional: die Brandings (Firmendaten, Logos, Farben, Recruiter, SMS-Konfiguration) manuell neu anlegen – dafür brauche ich die Daten von dir, oder du legst sie über `/admin/brandings` selbst wieder an.

## Schritt 5 – Kontrolle

Nach dem Wiederaufbau: Typen neu erzeugen, Typprüfung laufen lassen, Sicherheitsprüfung durchführen und die App im Vorschaufenster testen (Login, Adminbereich, öffentliche Buchungsseite).

## Technische Details

- Quelle der Rekonstruktion: `supabase/migrations/*.sql` (192 Dateien, ca. 6.250 Zeilen) – wird chronologisch neu abgespielt.
- `INSERT`-Anweisungen auf `storage.buckets` werden aus dem Replay entfernt; Ordner werden über das dafür vorgesehene Werkzeug angelegt, die Regeln auf `storage.objects` bleiben Teil der Migration.
- Historische Datenkorrektur-Anweisungen (`UPDATE`/`DELETE` auf inzwischen leere Tabellen) laufen wirkungslos mit und werden nicht entfernt, um die Reihenfolge nicht zu gefährden.
- Nach erfolgreichem Replay wird `src/integrations/supabase/types.ts` automatisch neu erzeugt; Codeänderungen sind nicht nötig, da der Anwendungscode unverändert bleibt.
