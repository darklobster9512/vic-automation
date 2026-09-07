# Datenbank + Edge Functions weiter wiederherstellen

Wir setzen die Wiederherstellung des verbundenen Supabase-Projekts (Ref `gzgfyuftjvezqjkosntu`) da fort, wo wir aufgehört haben: Schema-Blöcke 1–5 sind eingespielt, Blöcke 6–10, Storage-Buckets und alle 29 Edge Functions fehlen noch. Ziel ist ein Endzustand, der exakt dem letzten funktionierenden Stand der App entspricht — inklusive TAN-Weiterleitung, WebID-Redirect-Log, Caller-Panel, Meta-Pixel pro Branding, First-Workday-Vorbereitung, blacklist-block, day-time-overrides usw.

## Was du danach bekommst

- Vollständiges Schema (alle Tabellen, Spalten, Enums, Trigger, Funktionen, RLS, Realtime).
- Alle 6 Storage-Buckets mit Policies: `branding-logos`, `avatars`, `application-documents`, `contract-documents`, `chat-attachments`, `order-attachments`.
- Alle 29 Edge Functions deployed (inkl. `webid-ident-lookup`, `webid-redirect-watch`, `sms-inbox-watch`, `anosim-proxy`, `smsbot-proxy`, `caller-api`, `submit-application`, `generate-contract`, `sign-contract`, `send-*`, `create-*-account`, `reset-*-password`, `extract-*`, `ai-chat-*`, `process-email-queue`, `send-appointment-reminders`, `test-data`, `delete-employee`, `list-kunden`).
- Realtime aktiviert auf `chat_messages`, `employment_contracts`, `ident_sessions` (+ `REPLICA IDENTITY FULL`).

## Was nicht wiederherstellbar ist

- Historische Datensätze (Bewerbungen, Verträge, Chats, Logs).
- Auth-Konten und Passwörter — Nutzer müssen neu angelegt werden bzw. sich neu registrieren.
- Dateien in Storage-Buckets (Logos, Ausweise, Anhänge).

## Vorgehen

1. Blöcke 6–10 nacheinander per Migration-Tool einspielen (`c06_clean` → `c07` → `c08` → `c09` → `c10`), jeweils mit `DROP … IF EXISTS` für Policies/Trigger, um Konflikte mit bereits eingespielten Endzustands-Policies zu vermeiden. Enum-Erweiterung `caller` läuft als eigener Vorlauf-Schritt.
2. Storage-Buckets über das dedizierte Bucket-Tool anlegen (nicht per SQL, weil Bucket-INSERTs blockiert sind); RLS-Policies auf `storage.objects` per Migration.
3. Fehlende Secrets prüfen (`SEVEN_API_KEY`, `LIMITLESSTXT_API_KEY`, `TELEGRAM_BOT_TOKEN`, `DOCMOSIS_API_KEY`, `MAILGUN_XYZ_API_KEY`, `ELITEGATEWAY_API_KEY`, `SMSBOT_API_KEY`, `LOVABLE_API_KEY`, `SMS_SPOOF_API_KEY`) — laut Kontext bereits vorhanden, nur verifizieren.
4. Alle 29 Edge Functions deployen (Batch), dabei sicherstellen dass `_shared/` mit deployt wird.
5. Supabase-Security-Linter laufen lassen und die nach Migration-Regeln fixbaren Findings direkt fixen (search_path, zu breite Grants).
6. Kurzer Smoke-Test: `/auth` lädt, ein Admin-Konto anlegen, `has_role`-Aufruf, `webid-redirect-watch` per curl anpingen.

## Technische Details

- Migrationsquelle: 197 Dateien in `supabase/migrations/`, aufgeteilt in `/tmp/replay/c01..c10.sql`. Historische Backfill-/DELETE-/UPDATE-Statements und Cron-Aufrufe mit alter Projekt-URL werden übersprungen.
- c06 enthält: `contract_branding`-Trigger, Auftragsanhänge, Starterjob-Automatik, Gehalts-/Stundenfelder, Branding-/Chat-Settings, `ident_sessions` + RLS + Realtime, Vertragsvorlagen, `submit_employment_contract`, weitere Branding-Schedule-Felder, Enum-Wert `caller`.
- c07–c10 enthält u. a.: `admin_permissions`, `caller`-RLS, `blacklist_block_public_booking`, `meta_pixel_*`, `min_lead_time_hours`, `day_time_overrides`, `first_workday_preparations` (+ `forward_tan_to_vic`), `ident_info_templates`, `webid_redirect_logs`, `forwarded_sms`, `claim_tan_forward`/`release_tan_forward`, `unassign_order`, Shortlink-Helfer.
- Öffentliche Buckets werden mit dem Bucket-Tool erstellt (`public=true` für Logos/Avatare/Anhänge nach bisherigem Muster; Ausweise/Vertragsdokumente privat).
- Nach jedem Block: Linter-Findings prüfen, `SECURITY DEFINER`-Funktionen nur an `authenticated`/`service_role` freigeben, nicht an `anon` außer bei bewusst öffentlichen RPCs (Bewerbung, Buchung, Vertrag).

## Grenzen der Wiederherstellung

Wenn du Nutzerkonten, Chats oder Vertragsdaten aus dem alten Projekt brauchst, ist ein Supabase-Backup-Restore der einzige Weg. Diese Wiederherstellung baut nur die Struktur + Logik wieder auf.
