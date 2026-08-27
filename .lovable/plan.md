# Bessere KI-Antwortvorschläge im Admin-Livechat

## Ziel

Im Admin-Livechat erscheint der KI-Antwortvorschlag automatisch als Karte direkt über dem Eingabefeld – ohne Klick. Die KI duzt konsequent und kennt den kompletten Chatverlauf, antwortet aber immer auf die neueste Mitarbeiter-Nachricht.

## Verhalten

1. Sobald eine Konversation geöffnet wird und die letzte Nachricht vom Mitarbeiter stammt, lädt automatisch ein Vorschlag und wird in einer Karte über dem Eingabefeld angezeigt.
2. Kommt eine neue Mitarbeiter-Nachricht rein, wird der Vorschlag automatisch neu generiert.
3. Buttons in der Karte: „Übernehmen" (setzt Text ins Eingabefeld), Neu generieren, Schließen.
4. Hat zuletzt der Admin geschrieben, wird keine Karte angezeigt.
5. Ladezustand als Skeleton in der Karte; Fehler (z. B. Rate-Limit/Guthaben) werden in der Karte im Klartext angezeigt.
6. Der bestehende „Text optimieren"-Button (Sparkles) im Eingabefeld bleibt unverändert.

## Prompt-Verbesserungen

- Immer **Duzen**, niemals Siezen (explizite Regel, auch wenn Referenzbeispiele siezen).
- **Kompletter Chatverlauf** als Kontext (nicht nur die letzten 20 Nachrichten).
- Klarer Auftrag: Antwort ausschließlich auf die **letzte Mitarbeiter-Nachricht**.
- Ton: freundlich, hilfsbereit, kurz (2–3 Sätze), Deutsch, keine Anrede-Floskeln wie „Sehr geehrte".
- Nur der reine Antworttext, keine Formatierung/Erklärung.

## Technische Details

- `src/components/chat/AiSuggestionBar.tsx` existiert bereits, ist aber nirgends eingebunden. Sie wird in `src/pages/admin/AdminLivechat.tsx` direkt über `<ChatInput />` gerendert (nur wenn `active` gesetzt ist) und mit `onAccept={(t) => setExternalChatValue(t)}` an das bestehende `externalValue`-Prop des Eingabefelds angebunden.
- Kleine Anpassung in `AiSuggestionBar`: Vorschlag auch beim Konversationswechsel laden (nicht nur bei neuer Nachricht-ID), Reset bei `contractId`-Wechsel.
- `supabase/functions/ai-chat-suggest/index.ts`: Limit für den aktiven Chatverlauf entfernen (kompletter Verlauf, ggf. Kappung bei sehr großen Chats auf die letzten ~200 Nachrichten), System-Prompt um Du-Regel und „antworte auf die letzte Mitarbeiter-Nachricht" erweitern; Referenzbeispiele werden nur als Stil-, nicht als Anrede-Vorlage genutzt.
- Modell bleibt über den Lovable AI Gateway; Fehlerstatus 429/402 werden weiterhin sauber durchgereicht und in der Karte angezeigt.
