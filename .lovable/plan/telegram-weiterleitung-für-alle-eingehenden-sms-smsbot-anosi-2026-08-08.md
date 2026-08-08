# Telegram-Weiterleitung für alle eingehenden SMS (SMSBot + Anosim)

## Ziel

Jede SMS, die auf einer SMSBot- oder Anosim-Nummer eingeht, wird automatisch per Telegram weitergeleitet — mit Nummer, Zuweisung (Mitarbeitername + Auftrag) und dem SMS-Text.

## Zur Geschwindigkeit

Weder SMSBot noch Anosim schicken uns Webhooks (Push). „Sofort" ist deshalb nur über regelmäßiges Abrufen möglich. Vorschlag: ein serverseitiger Watcher, der **jede Minute** alle Nummern prüft — also maximal ~60 Sekunden Verzögerung, unabhängig davon, ob jemand im Panel ist. Falls SMSBot doch eine Webhook-Option im Account hat, kann später auf echtes Push umgestellt werden.

## Umfang

Alle Nummern werden überwacht:
- alle Einträge aus `phone_numbers` (SMSBot und Anosim, gefiltert nach Branding)
- zusätzlich alle Nummern aus aktiven Ident-Sessions (`ident_sessions.phone_api_url`)

## Nachrichtenformat (Telegram)

```text
📩 Neue SMS
━━━━━━━━━━━━━━━━━
📱 Nummer: +49157…
👤 Zugewiesen an: Max Mustermann
📦 Auftrag: DKB Onlineprozess-Test
✉️ Absender: DKB
🕒 Empfangen: 08.08.2026 10:14
━━━━━━━━━━━━━━━━━
<SMS-Text>
🏢 for.tel Solutions
```

Ist die Nummer niemandem zugeordnet, steht dort „Nicht zugewiesen".

## Technische Umsetzung

1. **Neue Tabelle `sms_inbox_seen`** (`provider`, `rental_id`/`order_id`, `message_hash`, `received_at`, `created_at`, unique auf Hash) — verhindert doppelte Telegram-Meldungen. Inklusive GRANTs, RLS an, nur `service_role` schreibt/liest.
2. **Neue Edge Function `sms-inbox-watch`** (`verify_jwt = false`):
   - lädt alle Nummern aus `phone_numbers` + `ident_sessions`
   - holt pro Branding die SMS (SMSBot: `/api/v1/sms` bzw. `/rentals`; Anosim: bestehende Share-/API-URL)
   - filtert bereits gesehene Nachrichten über `sms_inbox_seen`
   - ermittelt Zuweisung: `ident_sessions` (`phone_api_url` = `smsbot://<rentalId>` bzw. Anosim-URL) → `employment_contracts` (Name) + `orders` (Titel)
   - baut die Nachricht über `supabase/functions/_shared/telegramMessage.ts` und ruft die bestehende `send-telegram`-Logik mit Event `sms_empfangen` und passender `branding_id` auf
   - beim ersten Lauf werden vorhandene alte SMS nur als „gesehen" markiert, nicht verschickt (kein Spam-Schwall)
   - respektiert das bestehende Backoff/Cache-Verhalten, damit SMSBot-Ausfälle (502/503) keine Fehlerflut erzeugen
3. **Cron-Job** (pg_cron + pg_net), der die Function jede Minute aufruft.
4. **`AdminTelegram.tsx`**: neues Event `sms_empfangen` („Neue SMS", „SMS auf einer SMSBot-/Anosim-Nummer eingegangen") in der Event-Liste, damit du pro Chat und Branding steuern kannst, wer die Weiterleitung bekommt.

## Ergebnis

Alle eingehenden SMS landen innerhalb einer Minute automatisch im gewählten Telegram-Chat, mit Nummer, Zuweisung (Mitarbeiter + Auftrag) und Inhalt — auch ohne offenes Panel.
