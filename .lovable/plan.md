## Ziel

Genau **ein** Request pro Cache-Intervall zu SMSBot — die Antwort wird an alle Nutzer und alle parallelen Edge-Function-Isolates verteilt.

## Warum es aktuell nicht funktioniert

Supabase Edge Functions laufen unter Last in mehreren parallelen Deno-Isolates. Mein `let smsCache = ...` lebt nur innerhalb **einer** Isolate — 5 Isolates × 6 req/min = 30 req/min, plus zusätzliche Cold-Starts. Deshalb weiterhin 429.

## Fix: Cache in Deno KV (shared über alle Isolates)

`Deno.openKv()` steht in Supabase Edge Functions zur Verfügung und ist persistent + geteilt über alle Isolates derselben Function. Damit gibt es **wirklich** nur einen Request pro TTL.

### Änderungen in `supabase/functions/smsbot-proxy/index.ts`

1. **KV-Handle** auf Modul-Ebene: `const kv = await Deno.openKv();`
2. **Zentraler Helper** `cached<T>(key, ttlMs, fetcher)`:
   - `kv.get<{t:number,data:T}>([key])` → wenn frisch → sofort zurück.
   - Sonst: **Single-Flight-Lock** via `kv.atomic().check({key: [lockKey], versionstamp: null}).set([lockKey], 1, {expireIn: 3000}).commit()` — nur eine Isolate darf fetchen; die anderen warten kurz (150 ms Polling, max. 2 s) und lesen dann den frischen Cache.
   - Nach erfolgreichem Fetch: `kv.set([key], {t, data}, {expireIn: ttlMs * 3})` + Lock löschen.
   - Bei 429 von SMSBot: `kv.set([backoffKey], 1, {expireIn: 5000})` — solange dieser Key existiert, liefert der Proxy den letzten guten Cache-Wert (oder 429 wenn keiner da ist) ohne SMSBot anzufragen.
3. **Alle drei Actions** darüber:
   - `list` → key `smsbot:list`, TTL 30 s
   - `sms` → key `smsbot:sms`, TTL 12 s
   - `detail` → key `smsbot:detail:${rentalId}`, TTL 12 s
4. Response-Header `X-Cache: HIT|MISS|LOCKED` zur Verifikation.

### Kein Frontend-Change nötig
Client-Polling (10 s) bleibt. Der Server-Cache stellt sicher: **max. 5 Requests/Minute** zu SMSBot für SMS, **max. 2/Minute** für Liste, egal wie viele Nutzer/Isolates.

## Verifikation
- Deploy.
- 2–3 Minuten `/admin/telefonnummern` mit mehreren Tabs offen.
- Netzwerk-Tab: fast alle `smsbot-proxy`-Responses zeigen `X-Cache: HIT`.
- Kein 429 mehr im Console-Log.

## Technisches
- `Deno.openKv()` ohne Pfad → per-Function persistenter KV-Store, geteilt über alle Isolates.
- `expireIn` räumt automatisch auf.
- Kein DB-Schema, keine RLS-Änderung.
