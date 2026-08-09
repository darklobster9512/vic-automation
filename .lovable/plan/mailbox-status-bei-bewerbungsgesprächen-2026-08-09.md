# Mailbox-Status bei Bewerbungsgesprächen

## Ziel
Der bisherige Button "Erinnerungs-SMS & E-Mail senden" wird zu "Mailbox". Beim Klick wird weiterhin die Erinnerung versendet, zusätzlich wird der Gesprächsstatus auf "Mailbox" gesetzt und eine optionale Notiz gespeichert. Dieselbe Aktion soll das externe Caller-System per Edge Function auslösen können.

## Änderungen im Admin-Panel (`/admin/bewerbungsgespraeche`)

1. Button-Tooltip/Label des SMS-Icons wird "Mailbox".
2. Der bestehende Vorschau-Dialog ("Erinnerung senden") bekommt:
   - Titel "Mailbox"
   - ein zusätzliches Notizfeld (optional)
   - Hinweis, dass der Status auf "Mailbox" gesetzt wird
3. Beim Bestätigen passiert wie bisher der SMS-Versand plus Zähler/Zeitstempel, und zusätzlich:
   - Status des Termins wird über die bestehende Statusfunktion auf `mailbox` gesetzt
   - falls eine Notiz eingegeben wurde, wird sie wie bei "Erfolgreich"/"Fehlgeschlagen" in den Branding-Notizen gespeichert (Format `Vorname Nachname — Mailbox: <Text>`)
4. Status-Badge: neuer gelber/amber Badge "Mailbox", genau wie die anderen anklickbar, zeigt beim Klick die hinterlegten Mailbox-Notizen im Popover.
5. Notiz-Filterlogik wird um das Label "Mailbox" erweitert.
6. Der "Als erfolgreich markieren"-Button bleibt sichtbar, solange der Status nicht "erfolgreich" ist — Mailbox-Termine können also weiterhin normal abgeschlossen werden.

Kein Datenbank-Schema-Umbau nötig: `status` ist ein freies Textfeld, die vorhandene Statusfunktion akzeptiert den neuen Wert.

## Änderungen in der Edge Function (externes Caller-System)

In `caller-api` kommt eine neue Action `set_mailbox` dazu — ohne Vorschau-Schritt, ein einziger Aufruf:

- `{ action: "set_mailbox", appointment_id, note? }` →
  1. SMS-Text serverseitig aus der Vorlage `gespraech_erinnerung` bauen (Platzhalter `{name}`/`{telefon}` ersetzt)
  2. SMS versenden
  3. `reminder_count` / `reminder_timestamps` hochzählen
  4. Status auf `mailbox` setzen
  5. Notiz (falls vorhanden) in `branding_notes` schreiben
  6. Eintrag ins `caller_activity_log`

Optional kann `text` mitgeschickt werden, um die Vorlage zu überschreiben; ohne `text` wird immer der korrekte Vorlagentext verwendet.

Zusätzlich liefert `list_interviews` die Mailbox-Notizen mit aus (Status `mailbox` wird in der Notiz-Auswertung mitberücksichtigt), damit das externe Panel Status und Notiz anzeigen kann.

## So bindest du es im anderen System ein

Im externen Caller-Panel einen Button "Mailbox" hinzufügen, der genau einen Aufruf macht (gleicher Endpoint wie bisher, Header `x-caller-key`):

```text
POST https://<projekt>.supabase.co/functions/v1/caller-api
Header: x-caller-key: <dein Key>, Content-Type: application/json

{ "action": "set_mailbox", "appointment_id": "<id>", "note": "<optional>" }
→ { "ok": true }
```

Der SMS-Text kommt automatisch aus der Vorlage — es muss nichts vorher geladen oder angezeigt werden.

Danach die Liste neu laden — der Termin kommt mit `status: "mailbox"` und den Notizen zurück.
