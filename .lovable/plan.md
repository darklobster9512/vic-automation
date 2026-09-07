# Telegram-Benachrichtigung für eingehende SMS reparieren

## Was ich geprüft habe

- Der Telegram-Chat „SMS" ist korrekt eingerichtet: er hat die Events `sms_empfangen`, `tan_weitergeleitet` und `webid_redirect_abgefangen` und enthält auch das Branding der betroffenen Nummer. An der Konfiguration liegt es also nicht.
- Die TAN-Weiterleitung von heute 17:39 Uhr ist protokolliert (Versand an +49173759xxxx) — die hat funktioniert.
- Die Tabelle, in der der SMS-Wächter merkt, welche SMS er schon gesehen hat, ist **komplett leer** — es wurde also noch nie eine einzige SMS von ihm verarbeitet.
- In der Datenbank ist nur **ein** geplanter Hintergrund-Job aktiv: die stündlichen Termin-Erinnerungen. Der Minuten-Job, der den SMS-Wächter aufruft, fehlt.

## Ursache

Es gibt zwei getrennte Wege:

1. **TAN-Weiterleitung** läuft mit, sobald jemand die Ident-Seite offen hat — der Browser fragt die Nummer ab und leitet die TAN weiter samt Telegram-Meldung. Deshalb kam diese Meldung an.
2. **„Neue SMS"-Meldung** kommt ausschließlich vom serverseitigen Wächter, der jede Minute alle Nummern abfragen soll. Dieser Wächter wird seit dem Neuaufbau der Datenbank **überhaupt nicht mehr aufgerufen**, weil der zugehörige Minuten-Job beim Wiederherstellen verloren gegangen ist.

Zusätzlich fällt auf: der Wächter prüft aktuell nur Nummern, die unter Telefonnummern gespeichert sind. Nummern, die nur direkt in einer Ident-Sitzung hinterlegt wurden, werden gar nicht überwacht — auch nach dem Fix würden dort SMS unbemerkt bleiben.

## Lösung

1. Den Minuten-Job wieder anlegen, der den SMS-Wächter jede Minute aufruft (die Funktion selbst macht pro Aufruf mehrere Durchläufe, Verzögerung damit ca. 15 Sekunden).
2. Den Wächter zusätzlich alle Nummern aus aktiven Ident-Sitzungen abfragen lassen, nicht nur die fest gespeicherten Telefonnummern.
3. Beim ersten Lauf greift weiterhin die Alt-Bestands-Regel: nur SMS aus der letzten Stunde werden gemeldet, ältere werden still als gesehen markiert. Es gibt also keinen Nachrichten-Schwall.
4. Danach eine Test-SMS abwarten bzw. die Logs prüfen und bestätigen, dass die Meldung im Chat „SMS" ankommt.

## Hinweis

Die bereits eingegangene SMS von heute wird nicht rückwirkend gemeldet.

## Technische Details

- `cron.job`: neuer Eintrag `sms-inbox-watch-minutely` (`* * * * *`) via `pg_cron` + `pg_net` auf `/functions/v1/sms-inbox-watch`, analog zum bestehenden `appointment-reminders-hourly`.
- `supabase/functions/sms-inbox-watch/index.ts`: `scanOnce()` ergänzt um Nummern aus `ident_sessions.phone_api_url` (Status `waiting`/`data_sent`), dedupliziert gegen die bereits aus `phone_numbers` geladenen URLs, inkl. Normalisierung zwischen `/share/orderbooking?` und `/api/v1/orderbookingshare?`.
