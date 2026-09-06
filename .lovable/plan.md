# TAN-Weiterleitung ausschließlich bei „Daten gesendet“

## Verbindliche Regel
- Eine TAN darf **nur** weitergeleitet werden, wenn der zugehörige Ident-Auftrag aktuell exakt den Status `data_sent` („Daten gesendet“) hat.
- Bei `waiting`, `completed` („Abgeschlossen“) oder jedem anderen Status darf keine Weiterleitung stattfinden.
- Der Empfangszeitpunkt der ursprünglichen SMS ist dafür unerheblich; entscheidend ist ausschließlich der Ident-Status unmittelbar beim Weiterleitungsversuch.
- Für Dijana Janjic stehen beide Ident-Sessions inzwischen auf `completed`; damit darf für keine davon noch eine TAN weitergeleitet werden.

## Fix: atomare Reservierung vor dem Versand
Statt „lesen → senden → markieren" wird umgebaut auf „markieren (atomar, status-gesichert) → senden":

1. Neue kleine DB-Funktion (Migration), z. B. `claim_tan_forward(_session_id uuid, _sms_key text) returns boolean`:
   ```sql
   UPDATE ident_sessions
   SET forwarded_sms = forwarded_sms || to_jsonb(_sms_key)
   WHERE id = _session_id
     AND status = 'data_sent'
     AND forward_tan_to_vic = true
     AND NOT forwarded_sms @> to_jsonb(_sms_key);
   ```
   Rückgabe `true` nur für genau einen Aufrufer — damit ist garantiert:
   - nur **eine** Weiterleitung pro SMS (kein Doppelversand mehr), und
   - **kein** Versand, wenn der Status nicht exakt `data_sent` ist (die WHERE-Bedingung prüft den Status unmittelbar vor dem Versand).
2. `supabase/functions/_shared/forwardTan.ts` anpassen:
   - Die bisherige Freigabe für `waiting` entfernen; sowohl die direkte Session-Prüfung als auch die Suche über Telefonnummer/Ident-Link darf ausschließlich `data_sent` berücksichtigen.
   - Für jede SMS mit erkanntem Code zuerst `claim_tan_forward` aufrufen; nur bei `true` die SMS per seven.io senden und loggen.
   - SMS ohne Code weiterhin nur als gesehen markieren (kein Versand).
   - Bei fehlgeschlagenem Versand den Key wieder entfernen, damit ein Retry möglich bleibt.
3. Edge Functions `sms-inbox-watch`, `anosim-proxy`, `smsbot-proxy` neu deployen (sie importieren den Helper, kein eigener Code nötig).

## Wirkung
- Ausschließlich Idents mit Status „Daten gesendet“ leiten TANs weiter.
- Wartende und abgeschlossene Idents leiten **garantiert keine** TANs weiter.
- Jede eingehende SMS wird höchstens einmal an die private Nummer weitergeleitet.
- Telegram-Benachrichtigung und `sms_logs`-Einträge bleiben unverändert.
