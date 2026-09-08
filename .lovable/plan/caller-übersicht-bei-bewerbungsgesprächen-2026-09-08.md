# Caller-Übersicht bei Bewerbungsgesprächen

Neben dem Button "Vergangene Termine" auf der Seite Bewerbungsgespräche kommt eine kleine Übersicht der Caller-Zugänge des aktuell gewählten Brandings.

## Was man sieht
- Ein kompakter Button/Chip: "Caller-Zugänge (3)".
- Klick öffnet ein kleines Aufklapp-Fenster mit einer Liste:
  - Name des Zugangs (z. B. "Caller Max")
  - Slots als kleine Zahlen-Badges (z. B. Slot 1, Slot 2)
  - Status: aktiv / inaktiv (inaktive ausgegraut)
- Kein Zugang vorhanden: Hinweis "Keine Caller-Zugänge für dieses Branding".
- Nur Ansicht, keine Bearbeitung; Keys werden nie angezeigt. Zum Verwalten bleibt die bestehende Caller-Zugänge-Seite.

## Technisch
- Neue Komponente `src/components/admin/CallerAccessOverview.tsx`, Prop `brandingId`.
- Lädt per `supabase.from("caller_api_keys").select("id,label,slots,is_active").eq("branding_id", brandingId).order("label")`.
- Anzeige in `Popover` + Badges (bestehende shadcn-Komponenten).
- Einbau in `AdminBewerbungsgespraeche.tsx` in die Button-Zeile (Zeile ~629), nur gerendert wenn `activeBrandingId` gesetzt ist.
- Keine Datenbank- oder RLS-Änderungen, keine Benachrichtigungen.
