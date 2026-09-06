# WebID Widget „Demo Daten" mit Live-TAN

Ein verschiebbares Overlay-Widget wird ins WebID-Skript injiziert. Es zeigt Email, Telefonnummer und die per SMS eingehende TAN — genau für den Ident, der über die aktuelle WebID-URL identifiziert wird.

## Was der Nutzer sehen wird

- Kleines Panel oben rechts (per Drag frei verschiebbar, Position wird im localStorage gemerkt).
- Immer über dem bestehenden Logo-Badge sichtbar.
- Inhalt:
  - Titel: **Demo Daten**
  - `Email: …`
  - `Telefonnummer: …`
  - `TAN: -` (groß) → wechselt automatisch zur 6-stelligen TAN, sobald die SMS eintrifft.

## Ablauf

1. Widget liest die aktuelle URL (`location.href`), extrahiert `/aid/<id>` und schickt sie an eine neue Edge Function `webid-ident-lookup`.
2. Die Edge Function sucht in `ident_sessions.test_data` nach einem Eintrag mit passender IdentLink-URL (Match auf `/aid/<id>`) und liefert:
   - `email` (aus test_data „Email")
   - `phone` (aus `phone_api_url` → zugewiesene Nummer)
   - `session_id`
   - `tan` (falls schon empfangen)
3. Widget zeigt Email/Telefonnummer sofort an und pollt die Function alle 3 s weiter, bis eine TAN vorliegt.
4. `sms-inbox-watch` erkennt zusätzlich WebID-TAN-SMS (Regex `WebID Identification TAN\s*/\s*Code:\s*(\d{6})`) und schreibt die TAN in die Session. Ab dann liefert `webid-ident-lookup` die TAN aus und das Widget zeigt sie.

## Technische Details

### Datenbank
Neue Spalte `ident_sessions.last_tan text` + `last_tan_at timestamptz`. Keine neue Tabelle nötig — die TAN gehört zur Session.

### Neue Edge Function `webid-ident-lookup` (public, keine Auth)
- Input (GET/POST): `url` (die aktuelle WebID-URL) **oder** `aid`.
- Extrahiert `aid` aus der URL.
- Sucht `ident_sessions`, deren `test_data` einen Eintrag enthält, dessen Wert `/aid/<aid>` enthält (Label meist „IdentLink"). Nimmt die zuletzt aktualisierte Session.
- Antwortet JSON: `{ session_id, email, phone, tan, tan_at }`. Wenn nichts gefunden: `{ found:false }`.
- CORS offen (`*`), damit das Widget von jeder WebID-Domain aus fetchen kann.

### Änderung `sms-inbox-watch`
- Vor dem Telegram-Versand pro SMS: TAN-Regex prüfen. Bei Treffer und wenn eine passende Session zur `identifier` (bestehendes `resolveAssignment`) existiert → `ident_sessions.last_tan` + `last_tan_at` updaten.
- Telegram-Versand bleibt unverändert.

### Nginx-Skript (neue Version, Basis v16)
Zusätzlicher `sub_filter "</body>" …` Block, der ein IIFE-Widget injiziert:
- Erzeugt `<div id="sim-widget">` mit Titel, Email-, Nummer-, TAN-Zeile.
- Position aus `localStorage['sim-widget-pos']` wiederherstellen; Drag per pointer events, Speichern beim Loslassen.
- z-index über dem bestehenden `#sim-badge` (999999+).
- `fetch("https://…/functions/v1/webid-ident-lookup?url="+encodeURIComponent(location.href))` initial und dann alle 3 s per `setInterval`. Sobald `tan` gefüllt ist, Polling stoppen.
- Bei `found:false` bleibt Placeholder (`-`).

Alles andere aus v16 (Cleanup, Redirect-Log, Subfilter, Popup, Logo, Client-JS, Certbot) unverändert. Auslieferung als neues `webid_skript_universal_v17.sh` zum Copy-Paste.

### SMS-Beispiele die erkannt werden
```
WebID Identification TAN / Code: 227894
WebID Identification TAN / Code: 323885

P5KDROB/xzO
```
Regex greift beide Zeilen; Zusatztext wird ignoriert.

## Deliverables
1. SQL-Migration: `last_tan`, `last_tan_at` auf `ident_sessions`.
2. Neue Edge Function `webid-ident-lookup`.
3. Änderung in `sms-inbox-watch` (TAN-Erkennung + Session-Update).
4. Neues Nginx-Skript `webid_skript_universal_v17.sh` mit Widget-Injektion (im Chat als Copy-Paste).
