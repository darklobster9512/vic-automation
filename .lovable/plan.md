# Panel-Link per E-Mail ohne Termin-ID

Die Action `send_panel_link_email` in der Caller-API verlangt aktuell zwingend eine Termin-ID. Künftig reicht alternativ die E-Mail-Adresse (plus optional der Name), die das Caller-Panel mitschickt.

## Verhalten

- Mit `appointment_id`: unverändert wie bisher (Slot-Prüfung, Name/E-Mail aus der Bewerbung, Logging mit Termin-ID).
- Ohne `appointment_id`, aber mit `email`: Link wird direkt an diese Adresse geschickt. Name kommt aus `name` (oder `first_name`/`last_name`), sonst bleibt die Anrede neutral.
- Fehlt beides: HTTP 400 mit `{ "error": "appointment_id oder email erforderlich" }`.

## Technische Umsetzung

In `supabase/functions/caller-api/index.ts`:

1. Der globale Gate `if (!appointmentId) return json({ error: "appointment_id fehlt" }, 400)` wird für `send_panel_link_email` übersprungen — die Prüfung wandert in die Action selbst (alle anderen Actions bleiben unverändert termingebunden).
2. Body akzeptiert zusätzlich `email`, `name` (alternativ `first_name`/`last_name`). Die Action liest `appointment_id` **und** `appointmentId`, damit beide Schreibweisen funktionieren.
3. E-Mail-Validierung: einfache Format-Prüfung, sonst 400.
4. Branding/Link-Aufbau (`https://{subdomain_prefix|web}.{domain}`) und der `send-email`-Aufruf bleiben identisch; ohne Termin entfällt `metadata.appointment_id`/`application_id`.
5. Anrede: mit Name „Sehr geehrte/r {Name}," — ohne Name „Sehr geehrte Damen und Herren,".
6. Logging: `log(key, "send_panel_link_email", appointmentId ?? null, { to: email, source: appointmentId ? "appointment" : "manual" })`.

Keine Datenbank-Änderung nötig.

## Hinweis für das Caller-Panel

```text
Die Action send_panel_link_email akzeptiert jetzt auch einen Aufruf ohne Termin:

POST https://laozvnaupdecerpvwzmh.supabase.co/functions/v1/caller-api
Header: x-caller-key: <CALLER_API_KEY>
Body:  { "action": "send_panel_link_email", "email": "max@example.com", "name": "Max Mustermann" }

Alternativ weiterhin: { "action": "send_panel_link_email", "appointment_id": "<UUID>" }
Antwort: { "ok": true } | Fehler: HTTP 400 mit { "error": "..." }
```
