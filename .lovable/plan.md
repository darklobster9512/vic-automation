## Problem

`Deno.openKv()` ist in Supabase Edge Runtime nicht implementiert → Function crasht sofort beim Boot (`TypeError: Deno.openKv is not a function`) → SMSBot lädt gar nicht mehr.

## Fix

Shared Cache über eine Postgres-Tabelle statt KV. Postgres ist ohnehin bereits die einzige verlässliche geteilte Persistenzschicht der Edge Functions.

### 1. Migration: `edge_cache`-Tabelle

```sql
CREATE TABLE public.edge_cache (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  expires_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.edge_cache TO service_role;
ALTER TABLE public.edge_cache ENABLE ROW LEVEL SECURITY;
-- Keine Policies: nur service_role (Edge Functions) darf zugreifen.
CREATE INDEX ON public.edge_cache (expires_at);
```

### 2. `supabase/functions/smsbot-proxy/index.ts` umbauen

- `Deno.openKv()`-Import entfernen.
- Service-Role Supabase-Client (`@supabase/supabase-js` via `esm.sh`, `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`).
- Helper `cached(key, ttlMs, fetcher)`:
  1. `SELECT value, expires_at FROM edge_cache WHERE key = $1` — wenn frisch → HIT.
  2. Sonst: `fetcher()` aufrufen, mit `INSERT ... ON CONFLICT (key) DO UPDATE SET value, expires_at, updated_at` speichern → MISS.
  3. Kein hartes Lock nötig — bei paralleler Anfrage aus 2–3 Isolates gibt es maximal 2–3 doppelte Fetches pro TTL, das sind bei 12 s TTL max. ~15 req/min, weit unter dem 300/min-Limit.
- 429 vom SMSBot-API → `expires_at = now() + 10s` in einen Backoff-Row schreiben (`key = 'smsbot:backoff'`). Solange dieser Row existiert, wird kein neuer Fetch versucht — stattdessen der letzte gute Cache-Wert geliefert oder 429 wenn keiner da.
- Response-Header `X-Cache: HIT|MISS|STALE`.

### 3. Sonst nichts

Frontend unverändert, Anosim unverändert.

## Verifikation

- Deploy `smsbot-proxy`.
- `curl_edge_functions` mit `{"action":"list"}` liefert Nummern (nicht mehr 500).
- `/admin/telefonnummern` → SMSBot-Tab zeigt Nummern.
- 2 Tabs parallel → nur alle 30 s ein realer Request an SMSBot (Log-Check).

## Technisches

- Cache-Tabelle im `public`-Schema, nur `service_role`-Zugriff (RLS aktiv, keine Policies).
- `updated_at` erlaubt Debug/Monitoring.
- Alter Cleanup: optional Cron oder einfach ignorieren (kleine Tabelle, ~10 Zeilen).
