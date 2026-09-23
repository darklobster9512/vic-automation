# Backup-Reiter im Admin-Panel (Export + Wiederherstellung)

## Was du bekommst
Neuer Reiter **„Backups"** unter „Einstellungen" im Admin-Panel. Nur für Admins sichtbar. Kunden und Caller sehen ihn nicht.

**1. Backup erstellen**
- Button „Komplett-Backup erstellen" sichert alle Daten aller Brandings: Bewerbungen, Termine, Verträge, Mitarbeiter, Aufträge, Zuweisungen, Bewertungen, Entwürfe, Chats, Tickets, Idents, Vorlagen, Zeitpläne, Blockierungen, Telefonnummern, Logs, Einstellungen usw. Jede Tabelle wird gesichert.
- Dazu kommen die **Benutzerkonten** (Login-E-Mail, Passwort-Hash, Rollen). Nach einer Wiederherstellung können sich alle mit ihren alten Passwörtern anmelden.
- Du lädst eine **ZIP-Datei** herunter. Darin liegt pro Tabelle eine JSON-Datei, dazu eine `manifest.json` mit Datum, Anzahl der Zeilen pro Tabelle und Version.
- Große Tabellen werden in Blöcken ausgelesen, das Limit von 1000 Zeilen gilt also nicht.

**2. Backup wiederherstellen**
- Du lädst die ZIP-Datei hoch. Vorher siehst du eine Vorschau: Tabellen, Zeilenzahl und Datum des Backups.
- Zwei Modi:
  - **Ergänzen** (Standard): Nur fehlende Einträge werden eingefügt. Bestehende Einträge bleiben unverändert.
  - **Überschreiben**: Einträge mit gleicher ID werden durch den Stand aus dem Backup ersetzt.
- Die Reihenfolge der Tabellen beachtet die Abhängigkeiten. Beispiel: erst Brandings, dann Bewerbungen, dann Verträge, dann Aufträge.
- Während der Wiederherstellung werden **keine E-Mails, SMS oder Telegram-Nachrichten** verschickt. Automatische Aktionen wie Starter-Job-Zuweisung und Doppelbuchungs-Prüfung sind dabei ausgeschaltet, damit der Stand genau dem Backup entspricht.
- Am Ende siehst du einen Bericht: eingefügt, übersprungen und Fehler pro Tabelle.

**Grenzen**
- Hochgeladene Dateien wie Logos, Ausweise, Vertrags-PDFs und Anhänge sind nicht Teil der Daten. Gesichert werden nur ihre Links. Die Dateien selbst lassen sich optional in einem zweiten Schritt ergänzen, das macht die ZIP-Datei aber sehr groß.
- Für die Wiederherstellung muss die Datenbank-Struktur schon existieren. Das hattest du so vorgesehen.

## Technische Details
- Edge Function `admin-backup` mit den Aktionen `export` und `import`. Sie prüft das Token per `getClaims` und verlangt die Rolle `has_role(admin)`.
- Sie verbindet sich direkt über `SUPABASE_DB_URL` (postgres). So lassen sich alle Tabellen in `public` automatisch über `information_schema` erfassen, auch künftige Tabellen. Außerdem werden `auth.users` und `auth.identities` gesichert.
- Export: pro Tabelle `SELECT` in Blöcken. Die Funktion liefert JSON, das ZIP entsteht im Browser (JSZip).
- Import: Tabellen werden in der Reihenfolge der Fremdschlüssel sortiert. Die Funktion setzt `SET session_replication_role = replica`, damit Trigger und Fremdschlüssel-Prüfungen während des Imports ruhen. Danach folgt `INSERT … ON CONFLICT (id) DO NOTHING` bzw. `DO UPDATE`, in Blöcken zu 500 Zeilen, pro Tabelle in einer Transaktion. Der Browser lädt große Tabellen in mehreren Teilen hoch.
- Frontend: neue Seite `src/pages/admin/AdminBackups.tsx`, Route in `App.tsx`, Eintrag in der Seitenleiste (`/admin/backups`). Die Seite wird in `KUNDE_HIDDEN_PATHS` aufgenommen und ist zusätzlich im Code nur für Admins erreichbar.
- Keine Datenbank-Änderung nötig.
