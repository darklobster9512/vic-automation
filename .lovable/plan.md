## Vorgehen

Doku (https://smsbot.cc/en/api-docs) dokumentiert nur den **Webhook-Payload** (`sender`, `detectedService`, `message`, `receivedAt`, …). Der List-Endpoint `GET /sms` ist nicht mit Beispiel-Response gezeigt. Wir probieren `sender`/`detectedService` bereits — trotzdem "Unknown". Deshalb einmal loggen und mappen.

## Schritte

### 1. Temporäres Roh-Logging in `supabase/functions/smsbot-proxy/index.ts`

Im `doFetch` einen einmaligen Log für `/sms`:

```ts
if (url.endsWith("/sms")) {
  console.log("SMSBOT /sms RAW:", text.slice(0, 4000));
}
```

### 2. Deploy + Cache leeren + Call auslösen

- `smsbot-proxy` redeployen
- `DELETE FROM edge_cache WHERE key = 'smsbot:sms'`
- `curl_edge_functions {"action":"sms"}`
- `edge_function_logs smsbot-proxy` lesen → tatsächliche Feldnamen

### 3. `normSms` auf die realen Feldnamen anpassen

Erwartete Kandidaten laut Doku: `sender`, `detectedService`, `extractedCode`, `message`, `receivedAt`. Falls die List-Route stattdessen `sms.sender` oder verschachteltes `service.name` liefert, entsprechend.

### 4. Log wieder entfernen, redeploy

Frontend unverändert.
