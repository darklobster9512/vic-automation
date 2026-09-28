# Speicherordner für Uploads anlegen (Logo-Upload reparieren)

## Problem
Der Logo-Upload bei Brandings schlägt fehl, weil in der neuen Datenbank keine Speicherordner (Storage-Buckets) existieren. Das Anlegen wurde von einer Lovable-Arbeitsbereich-Richtlinie blockiert, die öffentliche Speicherordner verbietet.

## Wichtig: Die Einstellung ist bei Lovable, nicht bei Supabase
Die Blockierung kommt aus den **Lovable Workspace-Einstellungen**, nicht aus dem Supabase-Dashboard:
1. In Lovable oben auf den Arbeitsbereich/das Profil klicken
2. **Settings → Privacy & Security** öffnen
3. Die Option für öffentliche Speicherordner (public storage buckets) erlauben

## Vorgehen (nach Freischaltung)
1. Erneut versuchen, die 6 Speicherordner anzulegen:
   - `branding-logos` (öffentlich) – Branding-Logos, PM-/Recruiter-Fotos
   - `contract-documents` (öffentlich) – Ausweise, Meldebescheinigungen
   - `avatars` (öffentlich) – Profilbilder
   - `application-documents` (öffentlich) – Bewerbungsunterlagen
   - `chat-attachments` (öffentlich) – Chat-Dateien
   - `order-attachments` (öffentlich) – Auftrags-Anhänge
2. Zugriffsregeln (RLS auf `storage.objects`) pro Ordner setzen: Lesen öffentlich, Schreiben für angemeldete Nutzer bzw. Admins.
3. Logo-Upload bei Brandings testen.

## Fallback, falls öffentliche Ordner nicht freigegeben werden können
Ordner privat anlegen und die Anzeige auf signierte URLs umstellen. Das wäre ein größerer Eingriff (alle Stellen, die Logos/Dokumente anzeigen, müssten angepasst werden) – nur falls nötig.

## Technische Details
- Bucket-Anlage über das Storage-Tool (nicht per SQL, da `storage.buckets`-Writes abgelehnt werden)
- RLS-Policies auf `storage.objects` per Migration
- Keine E-Mails/SMS, keine Datenänderungen
