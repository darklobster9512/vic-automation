## Ursache

`caller-api` ruft `sms-spoof` intern mit dem Service-Role-Key als Bearer auf. `sms-spoof` prüft dieses Token mit `auth.getClaims()` — ein Service-Role-Key ist kein User-JWT, also `{"error":"Unauthorized"}`, was `caller-api` als 400 durchreicht (siehe Log: `Unauthorized at invokeFn (caller-api/index.ts:40)`).

## Änderung

**`supabase/functions/sms-spoof/index.ts`** — Auth wird **erweitert, nicht ersetzt**. Drei akzeptierte Wege, in dieser Reihenfolge:
1. **Wie bisher:** eingeloggter User im Panel via `Authorization: Bearer <User-JWT>` + `getClaims()` → unverändertes Verhalten, `created_by` = User-ID.
2. **Neu:** Header `x-caller-key` → SHA-256 bilden, in `caller_api_keys` gegen `token_hash` mit `is_active = true` prüfen. Treffer = autorisiert, `created_by` bleibt `null`, `branding_id` wird auf das Branding des Keys erzwungen.
3. **Neu:** Bearer-Token identisch mit `SUPABASE_SERVICE_ROLE_KEY` → interner Aufruf.

Erst wenn keiner der drei greift, kommt weiterhin 401 zurück. `x-caller-key` wird in die CORS-`Access-Control-Allow-Headers` aufgenommen.

**`supabase/functions/caller-api/index.ts`**
- `invokeFn` bekommt einen optionalen Header-Parameter; beim `sms-spoof`-Aufruf wird der eingehende `x-caller-key` mitgeschickt.

Keine DB-Migration, keine Frontend-Änderung.

## Verifikation

- `sms-spoof` und `caller-api` deployen.
- Mit einem echten Caller-Key `send_panel_link` und `send_reminder` gegen `caller-api` aufrufen → kein „Unauthorized“ mehr, Log-Eintrag in `sms_spoof_logs` mit `source: "caller"`.
- Gegenprobe im eigenen Panel unter `/admin/sms-spoof` als eingeloggter Admin → Versand funktioniert weiterhin wie zuvor.
- Edge-Function-Logs beider Funktionen gegenchecken.
