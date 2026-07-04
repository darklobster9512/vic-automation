## Ziel

`/admin/telefonnummern` erweitern, damit neben **Anosim** auch Nummern von **SMSBot** (`https://cabinet.smsbot.cc/api/v1`) exakt gleich funktionieren: Nummer anzeigen, SMS pollen (5s), TAN extrahieren, in `SmsWatch` verwenden und Ident-Sessions zuordnen.

## Änderungen

### 1. Datenbank — `phone_numbers` erweitern

Neue Spalten (Migration):
- `provider text NOT NULL DEFAULT 'anosim'` — Werte: `'anosim' | 'smsbot'`
- `rental_id text NULL` — SMSBot Rental-ID (bei Anosim NULL)
- `label text NULL` — optionaler Anzeigename

`api_url` bleibt (bei Anosim: Share-Link → API-Link; bei SMSBot: NULL, wird intern gebaut).

Existierende Zeilen bekommen automatisch `provider='anosim'` — keine Datenmigration nötig.

### 2. Secret

Neu: `SMSBOT_API_KEY` (via `add_secret`, ein globaler Account-Key — SMSBot nutzt Bearer-Token pro Account, nicht pro Nummer).

### 3. Edge Function — neu: `smsbot-proxy`

Analog zu `anosim-proxy`, ruft `GET https://cabinet.smsbot.cc/api/v1/rentals/:id` mit `Authorization: Bearer $SMSBOT_API_KEY` und mappt die Response ins **gleiche Format wie Anosim**, damit Frontend-Komponenten unverändert bleiben:

```json
{
  "number": "+34689018024",
  "country": "ES",
  "rentalType": "single",
  "service": "Bling",
  "startDate": "...",
  "endDate": "...",
  "state": "active",       // aus SMSBot-Status abgeleitet
  "sms": [
    { "messageSender": "Bling", "messageDate": "...", "messageText": "..." }
  ]
}
```

### 4. Frontend

**`AdminTelefonnummern.tsx`:**
- Dialog "Nummer hinzufügen" mit Provider-Auswahl (Radio: Anosim / SMSBot).
  - Anosim: bisheriges Eingabefeld (Share-Link).
  - SMSBot: Eingabefeld **Rental-ID** (+ optional Label).
- Insert schreibt `provider` + `rental_id` / `api_url`.
- `PhoneRow` ruft je nach `entry.provider` `anosim-proxy` oder `smsbot-proxy` — sonst identisch (Tabelle, Badges, SMS-Liste, Kopieren, Zuordnungen bleiben gleich, da das Datenformat identisch ist).
- Optional: kleiner Provider-Badge in der Namensspalte.

**`SmsWatch.tsx`** und alle anderen Konsumenten (`ident_sessions.phone_api_url` als Kennung):
- Die Zuordnungslogik nutzt einen stabilen Identifier. Vorschlag: Feld weiter `phone_api_url` benutzen; bei SMSBot dort `smsbot://<rental_id>` speichern. Damit müssen nachgelagerte Komponenten (SmsWatch, `ident_sessions`-Join) nicht angepasst werden — sie erhalten die Zeile aus `phone_numbers` und rufen den passenden Proxy.
- `SmsWatch` bekommt den kleinen Umbau: statt hart `anosim-proxy` aufzurufen, wählt es per `entry.provider` den Proxy.

### 5. Wie füge ich eine SMSBot-Nummer ein?

Sobald ausgerollt:

1. In `/admin/telefonnummern` auf **„Nummer hinzufügen"** klicken.
2. Provider **SMSBot** wählen.
3. **Rental-ID** eintragen (findet sich im SMSBot-Cabinet unter der gemieteten Nummer, Format wie `cmnajdcob000vlakbmc9y9xj2`).
4. Speichern → Zeile erscheint mit Nummer, Service, Countdown, SMS-Liste — Verhalten identisch zu Anosim (Polling alle 5s, TAN-Extraktion in `SmsWatch`).

Voraussetzung einmalig: `SMSBOT_API_KEY` als Supabase-Secret hinterlegt.

## Technisches (Detail)

- SMSBot-Status-Mapping: `active` → `active`, `expired`/`cancelled` → `ended`, sonst → `pending`.
- SMSBot-SMS-Feldnamen (`sender`, `message`, `receivedAt`) werden 1:1 auf Anosim-Feldnamen (`messageSender`, `messageText`, `messageDate`) gemappt.
- Rate-Limit SMSBot (300/min) reicht bei 5s-Polling und < ~10 aktiven Nummern locker.
- Kein Webhook nötig — Polling reicht und bleibt konsistent zu Anosim.

## Nicht Teil dieses Plans

- Nummern-Kauf/Extend/Cancel über UI (nur Anzeigen + SMS-Empfang wie bisher bei Anosim).
- Rückwärtige Migration bestehender Anosim-Zeilen.
- Änderungen an Ident-Session-Flows außer dem Proxy-Switch in `SmsWatch`.