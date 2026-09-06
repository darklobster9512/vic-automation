# TAN-Weiterleitung: Race-Condition & Doppelversand beheben

## Befund (geprüft an Dijana Janjic)
- Beide Ident-Sessions stehen auf `completed` — die Statusprüfung im Code existiert bereits und greift.
- Der Code wurde um 17:45:35.239 weitergeleitet, die Session wurde um 17:45:35.895 abgeschlossen: Die Weiterleitung las den Status, und in den ~0,6 s bis zum SMS-Versand wurde der Ident abgeschlossen.
- Zusätzlich wurde derselbe Code **zweimal** gesendet (zwei identische `sms_logs`-Einträge im selben Sekundenbruchteil), weil `sms-inbox-watch` und der Browser-Poller gleichzeitig liefen und beide vor dem Versand `forwarded_sms` als „noch nicht verarbeitet" lasen.

## Fix: atomare Reservierung vor dem Versand
Statt „lesen → senden → markieren" wird umgebaut auf „markieren (atomar, status-gesichert) → senden":

1. Neue kleine DB-Funktion (Migration), z. B. `claim_tan_forward(_session_id uuid, _sms_key text) returns boolean`:
   ```sql
   UPDATE ident_sessions
   SET forwarded_sms = forwarded_sms || to_jsonb(_sms_key)
   WHERE id = _session_id
     AND status IN ('waiting', 'data_sent')
     AND forward_tan_to_vic = true
     AND NOT forwarded_sms @> to_jsonb(_sms_key);
   ```
   Rückgabe `true` nur für genau einen Aufrufer — damit ist garantiert:
   - nur **eine** Weiterleitung pro SMS (kein Doppelversand mehr), und
   - **kein** Versand, wenn der Status inzwischen auf `completed` steht (die WHERE-Bedingung prüft den Status exakt zum Schreibzeitpunkt).
2. `supabase/functions/_shared/forwardTan.ts` anpassen:
   - Für jede SMS mit erkanntem Code zuerst `claim_tan_forward` aufrufen; nur bei `true` die SMS per seven.io senden und loggen.
   - SMS ohne Code weiterhin nur als gesehen markieren (kein Versand).
   - Bei fehlgeschlagenem Versand den Key wieder entfernen, damit ein Retry möglich bleibt.
3. Edge Functions `sms-inbox-watch`, `anosim-proxy`, `smsbot-proxy` neu deployen (sie importieren den Helper, kein eigener Code nötig).

## Wirkung
- Abgeschlossene Idents leiten **garantiert keine** TANs mehr weiter — auch nicht im Sekundenbruchteil um den Abschluss.
- Jede eingehende SMS wird höchstens einmal an die private Nummer weitergeleitet.
- Telegram-Benachrichtigung und `sms_logs`-Einträge bleiben unverändert.
