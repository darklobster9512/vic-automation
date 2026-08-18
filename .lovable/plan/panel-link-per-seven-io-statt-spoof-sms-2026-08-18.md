# Panel-Link per Seven.io statt Spoof-SMS

Der Panel-Link wird künftig über die normale Seven.io-SMS-Schnittstelle des jeweiligen Brandings verschickt (Branding-eigener `seven_api_key`, Absender = `sms_sender_name`), nicht mehr über den Spoof-Gateway.

## Was sich ändert

- Admin-Ansicht /admin/bewerbungsgespraeche: Button "Panel-Link per SMS" nutzt den Seven.io-Versand statt Spoof.
- Externes Caller-Panel (Aktion `send_panel_link`): gleiches Verhalten.
- Inhalt bleibt gleich: der reine Panel-Link (`https://{prefix}.{domain}`).
- Versand wird wie andere SMS unter SMS-Logs erfasst (Event `panel_link`), nicht mehr in den Spoof-Logs; es werden keine Spoof-Credits mehr verbraucht.

## Technische Details

- `src/pages/admin/AdminBewerbungsgespraeche.tsx` → `handleSendPanelLink`: `supabase.functions.invoke("sms-spoof", ...)` ersetzen durch `sendSms({ to, text: link, event_type: "panel_link", recipient_name, from: sms_sender_name, branding_id })` aus `src/lib/sendSms.ts`.
- `supabase/functions/caller-api/index.ts` → Aktion `send_panel_link`: `invokeFn("sms-spoof", ...)` ersetzen durch `invokeFn("send-sms", { to, text: link, event_type: "panel_link", recipient_name, from, branding_id })`.
- `send-sms` löst den Seven.io-Key bereits pro Branding auf (`brandings.seven_api_key`, Fallback globales Secret) — keine Änderung dort nötig.
- Absendername wird auf 11 Zeichen gekürzt (Seven.io-Limit, bereits in `send-sms` implementiert).
- Keine Änderung am Panel-Link-Versand per E-Mail.
