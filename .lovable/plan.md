## Ziel

Alle Telegram-Notifications sollen garantiert über das neue einheitliche Format laufen – nicht nur die Testnachricht.

## Befund aus dem Code-Audit

Ich habe alle Telegram-Quellen gesucht:

- Frontend-Helper: `src/lib/sendTelegram.ts`
- Frontend-Formatter: `src/lib/telegramMessage.ts`
- Admin-Testseite: `src/pages/admin/AdminTelegram.tsx`
- Livechat, Bewertung, Bewerbung, Termine, Arbeitsvertrag, Ident/Auftrag
- Edge Functions: `submit-application`, `sign-contract`, `send-telegram`
- Direkte Bot-API-Calls: nur in `send-telegram`

Aktuell ist der gefährliche Punkt: `sendTelegram(eventType, message, brandingId)` akzeptiert weiterhin beliebigen Text. Dadurch können alte/hardcodierte Nachrichten weiter durchrutschen. Genau das passiert bei `/admin/telegram`.

## Plan

1. `sendTelegram` zentral umbauen
   - Nicht mehr `message: string` als freien Text akzeptieren.
   - Stattdessen strukturierte Daten akzeptieren:

```ts
sendTelegram(eventType, {
  icon,
  title,
  fields,
  brandingName,
}, brandingId)
```

   - Der Helper baut intern immer mit `buildTelegramMessage(...)`.
   - Dadurch kann im Frontend keine Notification mehr versehentlich alten Plain-Text senden.

2. Alle Frontend-Notifications anfassen
   - `konto_erstellt`
   - `bewerbung_eingegangen`
   - `gespraech_gebucht`
   - `probetag_gebucht`
   - `erster_arbeitstag_gebucht`
   - `vertrag_eingereicht`
   - `bewertung_eingereicht`
   - `ident_gestartet`
   - `anhaenge_eingereicht`
   - `email_tan_angefordert`
   - `chat_nachricht`
   - `_test`

   Alle werden auf das neue strukturierte Format umgestellt.

3. `/admin/telegram` Testnachricht fixen
   - Die hartcodierte Nachricht

```text
🔔 Test-Nachricht von Vic Admin
```

   wird entfernt.
   - Test verwendet danach denselben zentralen Formatter wie alle anderen Notifications.

4. Edge Functions prüfen und absichern
   - `submit-application` und `sign-contract` nutzen bereits den Shared-Formatter, bleiben aber Teil der Prüfung.
   - `send-telegram` bleibt nur Transport-Funktion und sendet HTML an Telegram.

5. Validierung
   - Danach den Preview-Network-Request prüfen.
   - Kein Request darf mehr alte Plain-Text-Nachrichten enthalten.
   - Speziell `/admin/telegram` muss im Request Body einen HTML-formatierten Text mit `<b>...</b>` und Trenner senden.

## Ergebnis

Danach gibt es im Frontend keinen offenen Pfad mehr, der einfach irgendeinen hardcodierten Telegram-Text an `send-telegram` schicken kann.