# Panel-Link per E-Mail – nur E-Mail nötig

Die Action `send_panel_link_email` in der Caller-API braucht künftig ausschließlich die E-Mail-Adresse. Keine Termin-ID, kein Name.

## Verhalten

- Body: `{ "action": "send_panel_link_email", "email": "max@example.com" }`
- Fehlt die E-Mail oder ist das Format ungültig: HTTP 400 mit `{ "error": "..." }`.
- Erfolg: `{ "ok": true }`.

## Technische Umsetzung

In `supabase/functions/caller-api/index.ts`:

1. Die Action wird **vor** den globalen `appointment_id`-Gate verschoben, damit sie ohne Termin-ID läuft.
2. E-Mail aus dem Body lesen, trimmen, lowercase, einfaches Format prüfen.
3. Branding über `key.branding_id` laden, Link wie bisher: `https://{subdomain_prefix|web}.{domain}`.
4. `send-email` mit neutraler Anrede („Sehr geehrte Damen und Herren,"), Betreff/Titel/Button unverändert, `event_type: "panel_link"`, `branding_id`, ohne `metadata`-Termindaten.
5. Logging: `log(key, "send_panel_link_email", null, { to: email })`.

Keine Datenbank-Änderung nötig.

## Hinweis für das Caller-Panel

```text
POST https://laozvnaupdecerpvwzmh.supabase.co/functions/v1/caller-api
Header: x-caller-key: <CALLER_API_KEY>
Body:  { "action": "send_panel_link_email", "email": "max@example.com" }

Antwort: { "ok": true } | Fehler: HTTP 400 mit { "error": "..." }
```
