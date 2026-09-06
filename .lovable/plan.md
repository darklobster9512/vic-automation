# TAN-Weiterleitung an Vic-Nummer

Neue Option bei „Ident-Daten hinzufügen" und beim „1. Arbeitstag vorbereiten": eingehende SMS, die dem Mitarbeiter auf der Ident-Seite angezeigt werden, werden — sofern sie einen sechsstelligen Code enthalten — automatisch umgeschrieben und per SMS an die private Nummer des Mitarbeiters (Vic) gesendet. Für jede weitergeleitete TAN geht zusätzlich eine Telegram-Benachrichtigung raus.

## Ablauf für den Nutzer

1. Beim Anlegen/Bearbeiten einer Ident-Session (`/admin/idents/:id`) und im Vorbereitungs-Dialog des 1. Arbeitstags erscheint eine Checkbox „TAN an Vic-Nummer weiterleiten". Standard: aus.
2. Ist sie an und eine Telefonnummer (Anosim/SMSBot) hinterlegt, wird jede neue SMS geprüft. Enthält sie einen sechsstelligen Code, geht an die Vic-Nummer aus dem Vertrag folgende SMS raus:
   `"<code> - Ihr Code für die Verifizierung"`
3. Absendername ist der branding-eigene SMS-Absender (bereits konfiguriert), Versand über den branding-eigenen seven.io-Key.
4. Es geht eine Telegram-Info an die Kanäle, die für „SMS empfangen" abonniert sind: Mitarbeiter, Auftrag, Vic-Nummer, weitergeleiteter Code.
5. Jede SMS wird nur einmal weitergeleitet (Idempotenz), auch wenn mehrere Poller aktiv sind.

## Referenzverhalten (recovery-panel)

Übernommen wird das Muster aus `recovery-panel`:
- Toggle pro Zuweisung.
- Gemeinsame Weiterleitungslogik, aufgerufen sowohl vom Browser-Poll (`anosim-proxy`, `smsbot-proxy`) als auch vom Backend-Watcher (`sms-inbox-watch`).
- Nachrichtenschlüssel `sender|date` als Duplikatschutz in einem `forwarded_sms`-Array je Session.
- Telegram-Benachrichtigung für jede weitergeleitete TAN.

## Technische Umsetzung

### Datenbank (Migration)

- `ident_sessions`: `forward_tan_to_vic boolean not null default false`, `forwarded_sms jsonb not null default '[]'`.
- `first_workday_preparations`: `forward_tan_to_vic boolean not null default false` (wird beim Starten in die neu erzeugte `ident_sessions`-Zeile übernommen).
- Bestehende Grants/RLS decken die neuen Spalten ab.

### Shared Helper

Neu: `supabase/functions/_shared/forwardTan.ts`

- `processSessionForward(session, smsList)`:
  - Prüft `forward_tan_to_vic` und aktiven Status (`waiting`/`data_sent`).
  - Lädt Vic-Nummer aus `employment_contracts.phone`.
  - Ignoriert SMS älter als `session.updated_at` und bereits weitergeleitete (`sender|date`).
  - Extrahiert `\b\d{6}\b` (bevorzugt bestehendes WebID-TAN-Muster, sonst allgemeiner 6-stelliger Code).
  - Versendet über `sendSevenSms(brandingId, to, text)` mit dem branding-eigenen `seven_api_key` und `sms_sender_name`.
  - Aktualisiert `forwarded_sms` und schreibt `sms_logs`-Eintrag (`event_type: "tan_forwarded"`).
  - Feuert Telegram-Message über bestehende Helper (`buildTelegramMessage` + `sendTelegram`) auf Event `tan_weitergeleitet` (neuer Event-Type in `telegram_chats`-UI wird in `AdminTelegram` zur Auswahl ergänzt).

### Edge Functions

- `sms-inbox-watch`: nach dem bestehenden TAN-Handling die neue `processSessionForward`-Logik aufrufen (dieselbe aktive Session).
- `anosim-proxy` und `smsbot-proxy`: nach dem Laden der SMS zusätzlich `processSessionForward` aufrufen, damit die Weiterleitung auch bei Browser-Polls ohne Verzögerung greift.

### UI

- `AdminIdentDetail.tsx` (Ident-Daten-Card): neue Switch-Zeile „TAN an Vic-Nummer weiterleiten" unter dem Telefonnummer-Picker; speichert direkt auf `ident_sessions.forward_tan_to_vic`.
- `FirstWorkdayPrepDialog.tsx`: dieselbe Checkbox im Ident-Daten-Bereich; Wert wird in `first_workday_preparations.forward_tan_to_vic` gespeichert.
- `FirstWorkdayStartDialog.tsx`: übernimmt beim Erzeugen der `ident_sessions`-Zeile den Wert aus der Vorbereitung.
- `AdminTelegram.tsx`: neuer Event-Eintrag „TAN weitergeleitet" für die Chat-Abos.

### Sicherheit / Grenzen

- Nur aktive Sessions (`waiting`/`data_sent`) werden weitergeleitet — analog zur bestehenden `last_tan`-Logik, damit keine alten TANs an einen neuen Auftrag gehen.
- Ohne Vic-Nummer, ohne branding-`seven_api_key` oder ohne Telefonnummer wird still nichts weitergeleitet (kein Fehler); im `sms_logs`-Eintrag wird der Grund vermerkt.
