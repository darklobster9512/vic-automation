
## Problem

Der Runtime-Error zeigt eindeutig:
```
Edge function returned 429: ThrottlerException: Too Many Requests
```

SMSBot ratelimitet uns aggressiv. Grund: Bei jeder gemieteten Nummer feuern wir parallel Requests:
- `list` alle **10 s** (AdminTelefonnummern) + alle **15 s** (SmsWatch)
- **pro Zeile** zusätzlich ein `detail`-Call alle **5 s** (`PhoneRow`)

Bei z. B. 10 aktiven Nummern = ~130 Requests/Minute → Throttler schlägt zu.

## Lösung

Radikal weniger Requests, und die bereits im `list`-Response enthaltenen SMS wiederverwenden statt zusätzlicher Detail-Calls.

### 1. `smsbot-proxy` (edge function)
- Bei `list` sicherstellen, dass die normalisierten Rentals bereits die `sms`-Liste enthalten (macht `normRental` schon — Endpoint liefert `messages`/`sms`). Falls SMSBot bei `/rentals` die Nachrichten weglässt, bleibt es beim aktuellen Verhalten; Detail-Calls entfallen trotzdem (siehe unten).
- 429-Handling: bei Upstream 429 mit `Retry-After` antworten und einen kurzen In-Memory-Cache (z. B. 15 s) für `list` einführen, damit parallele Aufrufe (AdminTelefonnummern + SmsWatch) sich denselben Response teilen.

### 2. `AdminTelefonnummern.tsx`
- `smsbot list`-Query: `refetchInterval` **10 s → 60 s**, `refetchOnWindowFocus: false`.
- `PhoneRow` bei `provider === "smsbot"`:
  - **Kein** eigener `detail`-Fetch mehr. Stattdessen die Row-Daten aus dem gecachten `list`-Response nehmen (parent gibt `data` als Prop rein, oder Row liest `queryClient.getQueryData(["smsbot_rentals"])` und findet ihre Rental-ID).
- Anosim-Zeilen bleiben unverändert (5 s Polling), da separate API.

### 3. `SmsWatch.tsx`
- SMSBot-Query verwendet denselben QueryKey `["smsbot_rentals"]` mit `refetchInterval: 60_000`, `staleTime: 30_000` — Query-Deduplication greift, es entsteht nur 1 Request/Minute egal wie viele Komponenten aktiv sind.
- Für die TAN-Extraktion die SMS direkt aus dem List-Response nehmen (kein Detail-Call).

## Erwartete Wirkung

Vorher: ~130 Requests/min bei 10 Nummern.  
Nachher: **1 Request/min** an `/rentals` (list, gecacht), unabhängig von der Anzahl Nummern oder offenen Panels. → 429 verschwindet.

## Technisches Detail

- `PhoneRow` bekommt neuen optionalen Prop `data?: AnosimData`. Wenn `provider === "smsbot"` und `data` vorhanden → useQuery überspringen (`enabled: provider !== "smsbot"`).
- Parent iteriert über `smsbotEntries` und reicht das jeweils bereits normalisierte Rental als `data` durch.
- In-Memory-Cache im Edge-Function-Module-Scope: `let cache: {t: number; data: any} | null = null;` mit 15 s TTL für `action=list`.
