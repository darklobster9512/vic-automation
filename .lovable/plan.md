## Ursache

In `src/pages/mitarbeiter/AuftragDetails.tsx` (SMS-Fetch für Ident-Session) wird **immer** die Edge Function `anosim-proxy` mit `body: { url: phone_api_url }` aufgerufen — egal welcher Provider hinterlegt ist. Wenn der Admin eine SMSBot-Nummer zugewiesen hat, ist `phone_api_url = "smsbot://<rentalId>"`. `anosim-proxy` kennt dieses Schema nicht → liefert weder `sms` noch `number`, deshalb bleibt die SMS-Liste im Mitarbeiter-Panel leer.

Im Admin (`AdminIdentDetail.tsx`) wird korrekt anhand `startsWith("smsbot://")` zwischen `smsbot-proxy` und `anosim-proxy` unterschieden — deshalb funktioniert es dort.

## Fix

In `src/pages/mitarbeiter/AuftragDetails.tsx` beide betroffenen Effects (SMS-Fetch + Nummern-Auflösung) so anpassen, dass sie dieselbe Provider-Erkennung wie im Admin nutzen:

- Wenn `phone_api_url.startsWith("smsbot://")` → `smsbot-proxy` aufrufen mit `body: { rentalId: phone_api_url.slice("smsbot://".length) }` und die Antwort (`sms`, `number`) analog verwenden.
- Sonst weiter `anosim-proxy` mit `{ url }`.

Kein weiterer Umbau nötig (kein neuer State, kein UI-Change). Countdown-Logik bleibt identisch.

## Nicht enthalten

- Keine Änderung an `anosim-proxy` / `smsbot-proxy` selbst.
- Keine Änderung an Admin-Seiten oder `SmsWatch`.
- Keine RLS-/Berechtigungsänderung.