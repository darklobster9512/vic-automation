# Telegram-Meldung „Neue SMS" direkt beim SMS-Abruf senden

## Ausgangslage

- Der Telegram-Chat „SMS" ist korrekt konfiguriert (Events `sms_empfangen`, `tan_weitergeleitet`, `webid_redirect_abgefangen`, passende Brandings).
- Die TAN-Weiterleitung von 17:39 Uhr hat funktioniert und wurde auch in Telegram gemeldet.
- Die „Neue SMS"-Meldung kam nicht.

## Warum

Die TAN-Weiterleitung hängt direkt an den Proxies `anosim-proxy` / `smsbot-proxy`: sobald ein Vic seine Ident-Seite offen hat, ruft der Browser darüber die Nummer ab, und beide Proxies rufen im selben Moment die TAN-Weiterleitung samt Telegram-Meldung auf. Genau deshalb kam die TAN-Meldung an.

Die „Neue SMS"-Meldung dagegen hängt an einer separaten Hintergrund-Funktion (`sms-inbox-watch`), die überhaupt nicht mehr aufgerufen wird. Deshalb kommt nichts an, obwohl die SMS da ist.

## Lösung

Genauso wie die TAN-Weiterleitung: die Telegram-Meldung „Neue SMS empfangen" wird direkt in `anosim-proxy` und `smsbot-proxy` ausgelöst, wenn der Browser SMS abruft. Kein Wächter, kein Minuten-Job — die Meldung kommt exakt in dem Moment, in dem auch die TAN-Weiterleitung passiert.

Damit dieselbe SMS nicht mehrfach gemeldet wird (beide Vic-Sitzungen und mehrere Poll-Runden), wird pro SMS ein eindeutiger Schlüssel gespeichert und geprüft — analog zum Mechanismus, den die TAN-Weiterleitung bereits nutzt.

## Hinweis

Die bereits eingegangene SMS von heute wird nicht rückwirkend gemeldet.

## Technische Details

- Neue geteilte Funktion `supabase/functions/_shared/notifyIncomingSms.ts`:
  - Erwartet `{ provider, sourceKey, phoneNumber, brandingId, brandingName, messages }`.
  - Lädt Zuweisung (Mitarbeiter/Auftrag) über `ident_sessions.phone_api_url` wie bisher.
  - Idempotenz über die bestehende Tabelle `sms_inbox_seen` (Hash aus `date|sender|text`, Insert mit `onConflict ignoreDuplicates`).
  - Sendet an Telegram-Chats, die `sms_empfangen` abonniert haben, mit `buildTelegramMessage` (gleiches Format wie bisher).
  - Zeitfenster: nur SMS aus der letzten Stunde werden gemeldet; ältere werden still als gesehen markiert (verhindert Nachrichten-Schwall beim ersten Aufruf einer neu belegten Nummer).
- `supabase/functions/anosim-proxy/index.ts`: nach `fetch` zusätzlich `notifyIncomingSms` aufrufen (Provider `anosim`, `sourceKey` = gespeicherter Share-Identifier, `phoneNumber` aus `data.number`, `brandingId`/`brandingName` per Lookup in `phone_numbers` + `brandings`).
- `supabase/functions/smsbot-proxy/index.ts`: analog nach dem Rentals-/SMS-Fetch pro Rental `notifyIncomingSms` aufrufen (`sourceKey` = `<brandingId>:<rentalId>`, `phoneNumber` aus Rental-Objekt).
- `sms-inbox-watch` bleibt bestehen, ist aber nicht mehr erforderlich für die Live-Meldung.
