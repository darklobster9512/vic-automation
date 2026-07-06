## Ziel

Auf `/admin/telefonnummern` werden für **SMSBot**-Nummern aktuell keine SMS angezeigt. Grund: Der List-Endpunkt `GET /rentals` der SMSBot API liefert **nur** die Rentals ohne SMS-Nachrichten – SMS gibt es ausschließlich per `GET /rentals/:id` (laut API-Docs: "Get rental details including SMS messages"). Unser `PhoneRow` benutzt für SMSBot aber `initialData` aus dem Listen-Cache und deaktiviert das Refetch (`refetchInterval: false`), also bleibt `sms` immer leer.

Die anderen im Upload genannten Themen (Hero-Preview mobil ausblenden, 3+3+3 Funktions-Cards, "Bereit loszulegen"-Card, 500 €/Monat-Zentrierung) betreffen eine Landing-Page, die es in diesem Projekt nicht gibt – daher hier nicht Teil des Plans.

## Änderungen

### 1. `supabase/functions/smsbot-proxy/index.ts`
- Der `detail`-Zweig ist bereits vorhanden und ruft `GET /rentals/:id`. Sicherstellen, dass `normRental` alle möglichen SMS-Feldnamen deckt (`sms`, `messages`, `smsMessages`, `data.sms`) – bereits vorhanden, nur zusätzlich `raw?.data?.sms` als Fallback berücksichtigen falls das API die SMS unter `data` verschachtelt.
- Kleiner Micro-Cache pro `rentalId` (z. B. 4 s), damit paralleles Polling mehrerer offener Rows nicht ins Rate-Limit läuft.

### 2. `src/pages/admin/AdminTelefonnummern.tsx` (`PhoneRow`)
- Für SMSBot-Rows das Verhalten symmetrisch zu Anosim machen:
  - `refetchInterval: 5000` **auch** für SMSBot.
  - `initialData` weiterhin aus dem Listen-Cache (damit die Row sofort Nummer/Service/Status zeigt), aber `staleTime: 0`, damit sofort der Detail-Call für SMS folgt.
  - `queryFn` ruft für SMSBot immer `smsbot-proxy` mit `{ rentalId }` auf – der `detail`-Response liefert `sms[]`.
- Ergebnis: Die aufklappbare "Letzte SMS"-Sektion füllt sich innerhalb weniger Sekunden mit den echten Nachrichten und aktualisiert live.

### 3. Verifikation
- Nach Deploy: eine SMSBot-Nummer öffnen (Row expand), Test-SMS an die Nummer schicken, prüfen dass innerhalb ≤ 5 s die Nachricht erscheint.
- Netzwerk-Tab: `smsbot-proxy` liefert nun `sms: [...]` mit Einträgen.

## Technische Details
- API-Basis: `https://cabinet.smsbot.cc/api/v1` (Bearer `SMSBOT_API_KEY`, bereits gesetzt).
- Rate Limit: 300 req/min general → mit 5 s Polling pro offener Row unkritisch; Micro-Cache schützt zusätzlich.
- Kein DB-Schema-Change, keine RLS-Änderung.
