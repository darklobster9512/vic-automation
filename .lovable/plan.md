# Telegram-Benachrichtigungen pro Chat stummschalten

Im Livechat-Header (/admin/livechat) soll pro Chat ein Schalter erscheinen, mit dem Telegram-Benachrichtigungen für genau diesen Mitarbeiter-Chat abgeschaltet werden.

## Verhalten

- Neben den bestehenden Header-Aktionen des aktiven Chats kommt ein Glocken-Schalter "Telegram-Benachrichtigungen".
- Standard: aktiv. Ausgeschaltet: keine Telegram-Nachricht mehr, wenn dieser Mitarbeiter im Livechat schreibt.
- Der Zustand gilt dauerhaft und für alle Admins, nicht nur für die aktuelle Sitzung.
- Ist ein Chat stummgeschaltet, zeigt der Header ein deutliches "Stumm"-Kennzeichen.
- Alle anderen Telegram-Ereignisse (Bewerbungen, Termine, Tickets usw.) bleiben unberührt.
- Es werden keine Nachrichten, SMS oder E-Mails durch diese Änderung ausgelöst.

## Technische Umsetzung

1. Migration: neue Spalte `chat_telegram_muted boolean not null default false` auf `public.employment_contracts`. Keine neuen Tabellen, bestehende RLS-Policies decken Lesen (Mitarbeiter: eigener Vertrag) und Schreiben (Admin/Kunde) bereits ab.
2. `src/components/chat/useChatRealtime.ts`: vor dem `sendTelegram`-Aufruf für `sender_role === "user"` den aktuellen Wert von `chat_telegram_muted` des Vertrags prüfen (einmalig geladen und gecacht) und bei `true` die Benachrichtigung überspringen.
3. `src/pages/admin/AdminLivechat.tsx`: `chat_telegram_muted` beim Laden der Vertragsdaten mitlesen, Schalter im Header rendern, Umschalten per Update auf `employment_contracts`, optimistisches UI-Update plus Toast-Bestätigung.
4. Typecheck mit `tsgo` nach der Umsetzung.
