## Problem

SMSBot rate-limit (429). Ursache: pro geöffneter Row in `AdminTelefonnummern` und pro `SmsWatch`-Nutzer je ein 5 s-Poll gegen `GET /rentals/:id`. Bei 10–20 Nummern × mehreren Nutzern reißt das das 300 req/min-Limit sofort.

Laut SMSBot-Docs gibt es `GET /sms` → liefert **alle** SMS über **alle** Rentals in einem Call. Das ist der richtige Weg.

## Fix

### 1. `supabase/functions/smsbot-proxy/index.ts` — neuer `action: "sms"`
- Ruft `GET /sms` einmal, normalisiert zu `{ [rentalId]: AnosimSms[] }`.
- Modul-Cache `SMS_TTL_MS = 10_000` + `inflight`-Dedup (analog zur `list`-Action). → Egal wie viele Clients/Rows polling machen, max. 6 req/min gegen SMSBot.
- Bestehende `list`-Action: TTL von 15 s auf 30 s hoch (Nummern-Metadaten ändern sich selten).
- Detail-Action bleibt (Backup), aber der Client nutzt sie normalerweise nicht mehr.

### 2. `src/pages/admin/AdminTelefonnummern.tsx`
- Neue Top-Level-Query im Container: `["smsbot_sms"]` → `smsbot-proxy` action `sms`, `refetchInterval: 10_000`, `staleTime: 5_000`, nur aktiv wenn `provider === "smsbot"`.
- `PhoneRow` für SMSBot: **kein** eigener Detail-Poll mehr. `data` kommt aus dem Listen-Cache (Nummer/Service/Status), `sms[]` wird aus dem shared `smsbot_sms`-Cache über `rental_id` gefiltert und in die Row gemerged (via `useQueryClient().getQueryData`).
- Anosim bleibt unverändert (5 s pro Row — Anosim hat kein Rate-Problem und keinen Global-SMS-Endpoint).

### 3. `src/components/chat/SmsWatch.tsx`
- Gleicher Trick: statt `fetchPhoneData` per Detail-Call für SMSBot, den ausgewählten SMSBot-Eintrag aus `["smsbot_rentals"]` + `["smsbot_sms"]` mergen. Ein zusätzliches `useQuery(["smsbot_sms"])` mit 10 s Polling nur wenn `selectedEntry?.provider === "smsbot"`.
- Anosim-Zweig unverändert.

### 4. Ergebnis
- Max ~6 SMSBot-API-Calls/Minute pro Deno-Instance für SMS (statt N × 12).
- SMS erscheinen weiterhin innerhalb ≤ 10 s.
- 429 verschwindet.

## Zur Berechtigungs-Frage
Mitarbeiter sehen SMS-Nummern aktuell **unbeschränkt** über `SmsWatch` (Edge Function umgeht RLS). Das ist eine separate Design-Frage — nicht Teil dieses Fixes. Falls du Einschränkung willst (z. B. nur Nummern, die dem Ident-Session/Vertrag zugeordnet sind), sag Bescheid, dann folgt ein zweiter Plan.
