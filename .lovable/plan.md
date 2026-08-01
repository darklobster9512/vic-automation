# Caller-Bereich im s24-panel anbinden

Ziel: Caller arbeiten ausschließlich im s24-panel. Dieses Projekt stellt eine einzige, token-geschützte Edge Function als Schnittstelle bereit. Kein direkter DB-Zugriff vom anderen Projekt.

## 1. Datenbank hier im Panel

**Neue Tabelle `caller_api_keys`** (Zugangsschlüssel je Caller aus dem s24-panel):
- `id`, `label` (z. B. "Caller Max"), `token_hash` (SHA-256 des Keys), `branding_id`, `slots int[]` (z. B. `{1}` oder `{1,2}`), `is_active bool`, `last_used_at`, `created_at`
- RLS: **nur Rolle `admin`** darf lesen/schreiben (kein `kunde`, kein `caller`). Grants für `authenticated` + `service_role`.

**Neue Tabelle `caller_activity_log`** (Nachvollziehbarkeit): welcher Caller-Key hat wann welche Aktion ausgelöst. Ebenfalls nur für `admin` lesbar.

Slots bleiben wie bisher: die Slot-Nummer ergibt sich pro (Datum, Uhrzeit) aus der `created_at`-Reihenfolge der Buchungen des Brandings — genau die Logik, die `/admin/bewerbungsgespraeche` heute anzeigt. Diese Berechnung wird in eine SQL-Funktion `interview_slots_for_branding(_branding_id)` gezogen, damit Panel und Edge Function identisch rechnen.

## 2. Edge Function `caller-api` (dieses Projekt)

Ein Endpoint, Action-basiert, `verify_jwt = false`, Auth über Header `x-caller-key`. Der Key wird gehasht, in `caller_api_keys` nachgeschlagen → daraus ergeben sich `branding_id` + erlaubte Slots. Alles Weitere wird serverseitig auf dieses Branding/diese Slots eingeschränkt (der Caller kann keine fremden Daten anfragen).

Actions:

| Action | Zweck |
|---|---|
| `meta` | Branding-Name, Logo, Slot-Zuweisung des Callers |
| `list_interviews` | Termine des Brandings, gefiltert auf die Slots des Callers. Params: `view` = `default` \| `past` \| `future`, `search`, `page`. Liefert Name, Telefon, E-Mail, Anstellungsart, Datum/Uhrzeit, Slot, Status, Erinnerungszähler, Probetag-Termin, vorhandene Notizen. |
| `set_status` | Status `erfolgreich` \| `fehlgeschlagen` setzen (via bestehender RPC `update_interview_status`) + optionale Notiz. Notiz wird als `branding_notes` mit `page_context = 'bewerbungsgespraeche'` und exakt dem bestehenden Format `Vorname Nachname — Erfolgreich: <Text>` bzw. `— Fehlgeschlagen: <Text>` gespeichert, `author_email` = Caller-Label. Damit erscheint sie hier sofort im Aktivitätsprotokoll und im Status-Popover. |
| `send_panel_link` | Spoof-SMS mit Panel-Link — identische Logik wie der Panel-Button (`sms-spoof`, Sender aus Branding, Link `https://{prefix}.{domain}`). |
| `send_reminder` | Erinnerungs-SMS: Template `gespraech_erinnerung`, Ersetzung `{name}`/`{telefon}`, Versand über `send-sms`, erhöht `reminder_count`/`reminder_timestamps`. Mit `preview: true` nur Textrückgabe für die Vorschau drüben. |
| `resend_success_email` | "Bewerbungsgespräch erfolgreich"-E-Mail erneut senden (inkl. `probetag_invite_count`). |

Wichtig: Die "Gespräch erfolgreich"-Mail wird beim Statuswechsel weiterhin **nicht** automatisch versendet (bleibt an die Starterjob-Bewertungen gekoppelt).

CORS offen, damit das andere Projekt die Function aufrufen kann.

## 3. Admin-UI hier

Neue Seite `/admin/caller-zugaenge`:
- Liste aller Caller-Keys (Label, Branding, Slots, aktiv/inaktiv, letzte Nutzung)
- "Caller-Zugang erstellen": Label + Branding + Slot-Auswahl (Slots 1..n aus `interview_slots_per_time` des Brandings) → Key wird einmalig im Klartext zum Kopieren angezeigt
- Key deaktivieren / neu generieren, Slots nachträglich ändern

**Sichtbarkeit: ausschließlich Rolle `admin`.**
- Sidebar-Eintrag nur rendern, wenn `isAdmin` (nicht bei `kunde`, nicht bei `caller`)
- `/admin/caller-zugaenge` wird in `AdminLayout` zur `KUNDE_BLOCKED_PATHS`-Liste hinzugefügt → Kunden/Caller werden auf `/admin` umgeleitet
- Zusätzlich serverseitig durch RLS abgesichert (nur `has_role(auth.uid(),'admin')`), sodass ein Kunde die Daten auch per direktem Aufruf nicht sieht

## 4. Anleitung zum Kopieren ins s24-panel

Der folgende Text ist für das andere Lovable-Projekt gedacht:

```text
Ich möchte einen neuen Bereich "Bewerbungsgespräche" für die Caller-Rolle.
Die Daten kommen aus einem externen Panel über eine einzige Edge-Function-API.

API-Basis:
https://laozvnaupdecerpvwzmh.supabase.co/functions/v1/caller-api

Auth: Header "x-caller-key: <CALLER_KEY>".
Der Key darf NICHT im Frontend liegen. Lege im s24-panel pro Caller-User
den Key in einer Tabelle "caller_links" (user_id, caller_key, label) ab
und rufe die externe API ausschliesslich aus einer eigenen Edge Function
"interview-proxy" auf, die den Key des eingeloggten Users nachschlaegt.
Das Frontend ruft nur "interview-proxy" auf.

Alle Requests: POST, JSON-Body { "action": "...", ... }.

Actions:

1) { "action": "meta" }
   -> { branding: { id, company_name, logo_url }, slots: [1,2] }

2) { "action": "list_interviews", "view": "default"|"past"|"future",
     "search": "", "page": 0 }
   -> { items: [ { id, application_id, first_name, last_name, email, phone,
                   employment_type, appointment_date, appointment_time,
                   status, slot, slot_total, reminder_count,
                   probetag_invite_count, trial_day: {...}|null,
                   notes: [ { text, author, created_at, status } ] } ],
        total: 123 }
   "default" = heute + morgen, "past" = vergangen, "future" = ab uebermorgen.

3) { "action": "set_status", "appointment_id": "...",
     "status": "erfolgreich"|"fehlgeschlagen", "note": "optionaler Text" }
   -> { ok: true }
   Bei "fehlgeschlagen" ist die Notiz Pflicht, bei "erfolgreich" optional.

4) { "action": "send_panel_link", "appointment_id": "..." } -> { ok: true }

5) { "action": "send_reminder", "appointment_id": "...", "preview": true }
   -> { message: "SMS-Text..." }   (Vorschau)
   { "action": "send_reminder", "appointment_id": "...", "text": "..." }
   -> { ok: true }                 (tatsaechlich senden)

6) { "action": "resend_success_email", "appointment_id": "..." } -> { ok: true }

Fehler kommen als { error: "..." } mit Status 400/401/403.

UI-Anforderung:
- Tabelle mit Spalten: Name, Telefon, E-Mail, Anstellungsart, Termin
  (Datum + Uhrzeit), Slot, Status, Aktionen.
- Umschalter "Vergangene Termine" / "Zukuenftige Termine", Suche, Paginierung.
- Aktionen pro Zeile: "Erfolgreich" (Dialog mit optionaler Notiz),
  "Fehlgeschlagen" (Dialog mit Pflicht-Notiz), "Panel-Link per SMS",
  "Erinnerungs-SMS" (erst Vorschau-Dialog, dann senden),
  "Erfolgreich-E-Mail erneut senden".
- Klick auf einen Status-Badge zeigt die hinterlegten Notizen (Text, Autor, Datum).
- Es werden nur die Termine der Slots angezeigt, die dem Caller zugewiesen sind —
  das filtert die API bereits serverseitig.
```

## Technische Details

- Keys werden nur als SHA-256-Hash gespeichert; Klartext erscheint einmalig bei der Erstellung.
- Rate Limit pro Key (z. B. 120 Requests/Minute) über `edge_cache`.
- Jede schreibende Action wird protokolliert; Notizen erscheinen unverändert im bestehenden `BrandingNotes`-Protokoll.
- Bestehende Funktionen (`sms-spoof`, `send-sms`, `send-email`, `update_interview_status`) werden wiederverwendet — keine doppelte Geschäftslogik.
