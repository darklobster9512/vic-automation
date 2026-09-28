# Neue Datenbank mit der alten Struktur wieder aufbauen

## Ausgangslage
- Die neue Datenbank ist leer, es gibt noch keine einzige Tabelle.
- Im Projekt ist der komplette Bauplan der alten Datenbank noch gespeichert: 222 Änderungsschritte vom 11.02. bis 25.09.2026. Sie enthalten alle Tabellen, Zugriffsrechte, Automatiken und Zeitpläne.
- Alle 34 Server-Funktionen sind ebenfalls noch im Projekt, zum Beispiel Bewerbungen, E-Mail, SMS, Telegram, Verträge, Auftragsverteilung, Caller und Backups.

Logs sind deshalb nicht nötig. Der gespeicherte Bauplan ist genauer als jede Rekonstruktion aus Logs.

## Ablauf
1. **Bauplan zusammenfassen:** Alle 222 Schritte werden der Reihe nach zu einem Gesamtpaket zusammengefasst und gebündelt eingespielt. Schritte, die in der alten Datenbank einmalig Daten verändert haben, lasse ich weg. Das betrifft z. B. Umzüge von Bewerbungen, das Kopieren von Aufträgen oder Zuweisungen für Caller, weil es diese Daten nicht mehr gibt.
2. **Einspielen in Etappen:** Zuerst die Grundstruktur (Tabellen, Rollen, Hilfsfunktionen). Danach Zugriffsrechte, Automatiken und Live-Updates. Nach jeder Etappe prüfe ich auf Fehler.
3. **Speicherordner anlegen:** Die Ordner für Logos, Verträge, Anhänge, Ausweise usw. lege ich neu an. Die alten Dateien sind nicht mehr vorhanden.
4. **Zeitgesteuerte Abläufe:** Die tägliche Auftragsverteilung (werktags 08:00) und die Termin-Erinnerungen werden neu eingerichtet und zeigen auf die neue Datenbank. Einmalige Aktionen, die schon gelaufen sind (z. B. die Codebricks-Mitteilung vom 14.09.), richte ich nicht erneut ein.
5. **Server-Funktionen:** Alle 34 Funktionen werden neu in der neuen Datenbank installiert.
6. **Zugangsschlüssel:** Die Schlüssel für Resend, Seven.io, Telegram, LimitlessTXT, SMS-Bot, Docmosis usw. müssen in der neuen Datenbank neu hinterlegt werden. Ich prüfe, welche noch fehlen, und frage sie dann bei dir ab.
7. **Kontrolle:** Ich vergleiche die Anzahl der Tabellen, Rechte und Funktionen mit dem Bauplan und teste eine öffentliche Seite wie das Bewerbungsformular.

## Was du danach selbst machen musst
- Einen neuen Admin-Account registrieren. Den setze ich danach auf Admin.
- Brandings, Vorlagen und Logos neu anlegen oder aus einem Backup-ZIP einspielen, falls du über „Backups“ eines heruntergeladen hast.
- Die alten Konten und Daten sind endgültig weg. Mitarbeiter müssen sich neu registrieren.

## Sicherheit
- Beim Aufbau gehen keine E-Mails und keine SMS raus.

## Technische Details
- Die Migrationen werden inhaltlich zusammengeführt und in wenigen großen Migrationen über das Migrations-Tool eingespielt. Reine Datenmanipulationen (UPDATE/INSERT/DELETE auf Business-Daten) werden entfernt. Seed-Daten, die für die Struktur nötig sind (Enum-Werte, Standard-Einstellungen), bleiben erhalten.
- `supabase/config.toml` und `.env` werden auf die neue Projekt-Ref geprüft. Ebenso fest eingetragene URLs oder Keys in pg_cron-Jobs und im Code (z. B. `publicSupabase`).
- Buckets werden über das Storage-Tool angelegt, Storage-Policies laufen über die Migration.
- Danach laufen der Linter und `bunx tsgo`, und die Typen werden neu generiert.
