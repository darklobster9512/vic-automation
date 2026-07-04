## Problem

- Bei SMSBot **reicht der API-Key** — die API listet alle Rentals des Accounts via `GET /rentals` (aktive) bzw. `GET /rentals/history` (alle). Es ist **falsch, dass wir bisher eine Rental-ID pro Nummer manuell eintragen lassen**. Die "ID", die du eingetragen hast, ist deine Account-ID — die passt nicht auf `GET /rentals/:id` und liefert deshalb nichts.
- Anosim hat kein Account-Listing (jede Nummer ist ein einzelner Share-Link) → dort bleibt der bisherige Add-Flow richtig.

## Ziel

SMSBot-Tab lädt Nummern **automatisch aus dem Account** — kein manuelles Anlegen mehr.

## Änderungen

### 1. Edge Function `smsbot-proxy` — neue Action `list`

Body-Varianten:
- `{ action: "list" }` → `GET https://cabinet.smsbot.cc/api/v1/rentals` (aktive Rentals des Accounts).
- `{ rentalId: "…" }` (bestehend) → Detailabfrage `GET /rentals/:id`.

Response `list` gibt ein Array normalisierter Einträge im gleichen Anosim-Schema zurück (mit zusätzlichem `rentalId`, damit das Frontend Identifier bauen kann):

```json
[{ "rentalId": "cmn…", "number": "+34…", "country": "ES", "service": "…", "state": "active", "startDate": "…", "endDate": "…", "sms": [...] }]
```

### 2. Frontend `AdminTelefonnummern`

- Wenn Tab **SMSBot** aktiv ist:
  - Tabelle kommt aus `useQuery(['smsbot-rentals'], … invoke('smsbot-proxy', {action:'list'}))` mit `refetchInterval: 10000`.
  - **Add-Formular versteckt**, stattdessen Hinweisbox: „Nummern werden automatisch aus deinem SMSBot-Account geladen. Miete Nummern direkt im SMSBot Cabinet." mit Link auf `https://cabinet.smsbot.cc`.
  - Delete-Button ausblenden (Kündigung/Refund gehört ins Cabinet, out of scope).
- Wenn Tab **Anosim** aktiv ist: bisheriges Verhalten (DB-Query + manuelles Add + Delete).
- Pagination (20 pro Seite) und Live-SMS-Anzeige bleiben — Zeilen bekommen ihre Detaildaten bereits aus dem `list`-Response, keine weitere Einzelabfrage nötig für SMSBot.
- Identifier für `ident_sessions.phone_api_url` bleibt `smsbot://<rentalId>`, damit bestehende Ident-Zuordnungen weiter matchen.

### 3. Frontend `SmsWatch`

`entries` = Kombination aus:
- DB-Query auf `phone_numbers` gefiltert `provider='anosim'` (wie bisher).
- Live `smsbot-proxy` mit `action:'list'` → auf gleiches `PhoneEntry`-Shape gemappt (id = `smsbot-<rentalId>`, provider = `smsbot`).

Auswahl, TAN-Extraktion, Detail-Polling funktionieren unverändert (`fetchPhoneData` case `smsbot` → Detail-RPC).

### 4. Aufräumen

- Bestehende SMSBot-DB-Zeilen (deine gerade angelegte mit Account-ID) werden im SMSBot-Tab schlicht ignoriert — sie stören nicht, können aber via SQL/UI gelöscht werden. Kein Migrations-Zwang.
- Anosim-Tab und -Flow bleiben unangetastet.

## So funktioniert es danach

1. Du mietest Nummern im **SMSBot Cabinet**.
2. Im Panel öffnest du `/admin/telefonnummern`, Tab **SMSBot** — alle aktiven Rentals erscheinen automatisch.
3. Kein Rental-ID-Eintippen nötig, kein Anlegen im Panel. Der einzige Vorgang im Panel: Nummer aus der Liste per Klick einer Ident-Session zuweisen (wie bei Anosim).

## Nicht Teil davon

- History-Ansicht `/rentals/history` (bei Bedarf später als Toggle).
- Cancel / Extend / Buy via UI.
- Webhooks — Polling bleibt (10 s Liste, 5 s Detail).