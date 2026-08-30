# Panel-Link-E-Mail sofort versenden (Queue-Bypass)

Panel-Link-E-Mails (aus `/admin/bewerbungsgespraeche` und aus dem externen Panel via `caller-api`) sollen die Resend-Queue umgehen und sofort raus, unabhängig vom aktuellen Queue-Stau.

## Änderungen

1. **`send-email` Edge Function** erweitern um optionalen Parameter `bypass_queue: true`.
   - Wenn gesetzt: Branding laden, HTML per `buildEmailHtml` bauen und direkt per Resend-API senden – identische Logik wie in `process-email-queue`.
   - Ergebnis in `email_logs` mit Status `sent`/`failed` protokollieren (keine `email_queue`-Zeile).
   - Fehlerhafte/fehlende Resend-Konfiguration → 500 mit klarem Fehler.
   - Bei nicht gesetztem Flag: bestehendes Enqueue-Verhalten unverändert.

2. **`buildEmailHtml`** aus `process-email-queue/index.ts` in `supabase/functions/_shared/emailHtml.ts` extrahieren und in beiden Functions importieren, damit die Darstellung 1:1 gleich bleibt.

3. **Aufrufer auf `bypass_queue: true` umstellen**:
   - `src/pages/admin/AdminBewerbungsgespraeche.tsx` → `handleSendPanelLinkEmail`
   - `supabase/functions/caller-api/index.ts` → Action `send_panel_link_email`

## Technische Hinweise

- Suppression der Logo-Regeln (`bewerbung_angenommen*`) betrifft nur diese Event-Types, bleibt daher für `panel_link` inaktiv.
- Kein Schema-Change nötig; `email_logs` deckt Direktversand-Historie ab.
- Retry: Panel-Link-Direktversand wird bei Fehler nicht automatisch erneut versucht – Nutzer sieht Toast und kann erneut senden. (So bewusst, da Queue-Bypass gewünscht.)
