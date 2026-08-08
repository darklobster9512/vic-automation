# SMSBot 502/503 Fehler abfangen

## Ursache

Der Fehler kommt nicht aus unserem Code, sondern von SMSBot selbst: `cabinet.smsbot.cc` antwortet zeitweise mit HTTP 502/503 (Gateway/Service Unavailable). Unsere Edge Function `smsbot-proxy` reicht diesen Status aktuell 1:1 an das Frontend weiter.

Aktuell wird nur bei HTTP 429 (Rate Limit) auf den Cache zurückgefallen. Bei 5xx gibt es kein Fallback und kein Backoff — dadurch pollt das Frontend (alle 10-60 s, mehrere Seiten gleichzeitig) permanent weiter gegen einen kaputten Upstream und wirft laufend Fehler-Toasts.

## Änderung

In `supabase/functions/smsbot-proxy/index.ts`:

1. 5xx-Antworten (500, 502, 503, 504) genauso behandeln wie 429:
   - Wenn ein (auch abgelaufener) Cache-Eintrag existiert → diesen mit Status 200 und Header `X-Cache: STALE` zurückgeben, statt einen Fehler zu werfen.
   - Globalen Backoff pro Branding setzen (ca. 30 s bei 5xx), damit nicht jeder Poll erneut gegen den kaputten Upstream läuft.
2. Einen einmaligen Retry (nach ca. 500 ms) bei 502/503 einbauen, da diese Fehler bei SMSBot oft nur kurzzeitig auftreten.
3. Nur wenn gar kein Cache vorhanden ist, den Fehler durchreichen — dann mit klarer Meldung „SMSBot momentan nicht erreichbar".

Im Frontend (`AdminTelefonnummern.tsx`, `SmsWatch.tsx`, `AdminIdentDetail.tsx`, `AuftragDetails.tsx`):

4. Fehler-Toasts bei SMSBot-Ausfällen entschärfen: statt Fehlermeldung ein dezenter Hinweis „SMSBot vorübergehend nicht erreichbar – zeige letzte bekannte Daten", und React-Query so konfigurieren, dass alte Daten weiter angezeigt werden.

## Ergebnis

Kurze SMSBot-Ausfälle sind für dich unsichtbar: Nummern und SMS bleiben aus dem Cache sichtbar, Fehlermeldungen erscheinen nur noch bei einem echten Totalausfall ohne vorhandene Daten.
