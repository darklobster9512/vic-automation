# TAN direkt an Ident-Edge-Function pushen

Sobald `forwardTan` eine neue 6-stellige TAN erkennt und sie per SMS an die VIC-Nummer schickt, soll parallel ein Push an die Ident-Edge-Function gehen – mit E-Mail, Telefonnummer und TAN. Damit muss die Ident-Seite nicht mehr auf ihren nächsten Poll warten.

## Verhalten

- Push feuert nur, wenn die aktuelle Bedingung für die VIC-Weiterleitung erfüllt ist (Session-Status `data_sent`, `forward_tan_to_vic = true`, TAN nach Sessionstart eingegangen, noch nicht in `forwarded_sms`).
- Push und SMS laufen unabhängig: schlägt der Push fehl, bleibt die SMS-Weiterleitung erhalten (nur Log-Warnung, kein Fehler).
- Deduplizierung nutzt weiterhin denselben `forwarded_sms`-Claim; der Push wird innerhalb desselben Claim-Fensters ausgelöst, damit pro TAN genau ein Push rausgeht.

## Endpoint

Erweiterung von `webid-ident-lookup` um einen POST-Push-Modus:

- Bestehendes Verhalten (GET / POST mit `url`/`aid`) bleibt unverändert.
- Neuer Body-Modus: `{ action: "push_tan", session_id, tan, phone?, email? }`.
  - Lädt die Session per `session_id`, prüft Status `data_sent`.
  - Aktualisiert `last_tan`/`last_tan_at`, falls neuer.
  - Antwortet `{ ok: true }`; bei ungültiger Session `{ ok: false, reason }`.
- Kein zusätzlicher Secret nötig – Aufruf erfolgt server-to-server mit `SUPABASE_SERVICE_ROLE_KEY` (wie bei den bestehenden internen Aufrufen von `anosim-proxy`/`smsbot-proxy`).

## Änderungen

1. `supabase/functions/webid-ident-lookup/index.ts` – Push-Branch am Anfang von `Deno.serve` ergänzen.
2. `supabase/functions/_shared/forwardTan.ts` – nach erfolgreichem VIC-SMS-Versand `fetch` auf `webid-ident-lookup` mit `{ action: "push_tan", session_id, tan, phone, email }`. Fehler nur loggen.
3. Deploy: `webid-ident-lookup` und alle Funktionen, die `forwardTan` importieren (`anosim-proxy`, `smsbot-proxy`, `sms-inbox-watch`).

## Nicht Teil dieser Änderung

- Keine Änderung an der VIC-SMS-Logik selbst.
- Keine neue Tabelle, keine neuen Secrets, kein neuer Cron.
- Externe Recovery-Panel-URL wird nicht angesprochen (Panel pollt weiter `webid-ident-lookup`).
