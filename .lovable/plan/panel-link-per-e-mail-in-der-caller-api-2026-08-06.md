# Panel-Link per E-Mail in der Caller-API

Der Button „Panel-Link per E-Mail" existiert bisher nur im internen Admin (`/admin/bewerbungsgespraeche`). Die Caller-API bekommt dieselbe Funktion als neue Action, damit das externe Caller-Panel sie auslösen kann.

## Änderung in diesem Projekt

In `supabase/functions/caller-api/index.ts` eine neue Action `send_panel_link_email` ergänzen (analog zu `send_panel_link` / `resend_success_email`):

- Termin über `loadAppointment(key, appointmentId)` laden (Slot-Scoping bleibt damit erhalten)
- Fehler 400, wenn keine E-Mail-Adresse hinterlegt ist
- Branding laden, Link bauen: `https://{subdomain_prefix|web}.{domain}`
- `invokeFn("send-email", { ... })` mit exakt demselben Inhalt wie im Admin:
  - Betreff: `Ihr Zugang zum Mitarbeiterportal – {company_name}`
  - Titel: „Ihr Portal-Zugang", 3 Textzeilen, Button „Zum Portal" → Link
  - `event_type: "panel_link"`, `branding_id`, `metadata: { appointment_id, application_id }`
- `log(key, "send_panel_link_email", appointmentId, { to: email })` für das Aktivitätsprotokoll
- Antwort `{ ok: true }`

Keine Datenbank-Änderung nötig; die E-Mail-Vorlage `panel_link` besteht bereits.

## Was du dem anderen Lovable-Projekt sagen sollst

Diesen Text kannst du dort 1:1 einfügen:

```text
Bitte im Caller-Panel bei jedem Bewerbungsgespräch einen zusätzlichen Button
„Panel-Link per E-Mail" (Mail-Icon) neben dem bestehenden Spoof-SMS-Button einbauen.

Aufruf identisch zu den bestehenden Actions, gegen dieselbe Edge Function:

POST https://laozvnaupdecerpvwzmh.supabase.co/functions/v1/caller-api
Header: x-caller-key: <CALLER_API_KEY>
Body:  { "action": "send_panel_link_email", "appointmentId": "<UUID des Termins>" }

Antwort: { "ok": true }
Fehlerfall: HTTP 400 mit { "error": "..." } (z. B. „Keine E-Mail-Adresse hinterlegt")

Button deaktivieren/Spinner zeigen während des Requests, Erfolgs-Toast
„Panel-Link an <E-Mail> gesendet", Fehler-Toast mit der error-Message.
Button ausblenden oder deaktivieren, wenn beim Bewerber keine E-Mail hinterlegt ist
(Feld `email` kommt bereits in `list_interviews` mit).
```
