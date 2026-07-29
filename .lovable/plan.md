## Was ich geprüft habe (Fakten, keine Vermutung)

- `src/lib/sendTelegram.ts` nimmt **nur noch** strukturierte Optionen und baut den Text über `buildTelegramMessage`.
- Alle 14 Frontend-Call-Sites (Auth, Bewerbungsgespraech, Probetag, ErsterArbeitstag, Arbeitsvertrag, MitarbeiterArbeitsvertrag, AuftragDetails ×3, Bewertung, useChatRealtime, AdminBewerbungen, AdminTelegram-Test) nutzen dieses Format. Kein direkter `supabase.functions.invoke("send-telegram")` mehr im Frontend.
- Edge Functions `submit-application` und `sign-contract` nutzen `_shared/telegramMessage.ts`.
- `send-telegram` selbst formatiert **nichts** – es schickt den empfangenen Text 1:1 an Telegram.
- In der Datenbank gibt es **keine** Funktion/Trigger, die Telegram aufruft.
- Alles ist committet (`d6c22aa`).

Das heißt: Im aktuellen Code kann keine alte Nachricht mehr entstehen. Trotzdem kommen bei dir alte an – dafür bleiben genau zwei mögliche Ursachen, und die will ich nicht raten, sondern beweisen.

## Plan

1. **Beweis-Logging** in `supabase/functions/send-telegram/index.ts`: den exakten eingehenden `event_type` und den kompletten `message`-Text loggen (plus einen Marker `v2`), damit in den Logs schwarz auf weiß steht, welcher Text ankommt und woher.
2. Edge Functions neu deployen (`send-telegram`, `submit-application`, `sign-contract`).
3. Testnachricht aus der Preview auslösen und die Logs lesen:
   - Kommt der **neue** Text an → die Quelle deiner alten Nachrichten ist die **veröffentlichte Live-Seite**, die noch das alte Frontend-Bundle ausliefert (echte Bewerbungen/Chats laufen dort, nicht in der Preview). Fix: Publish/Update.
   - Kommt der **alte** Text an → ich habe die konkrete Quelle im Log (event_type) und fixe genau die Stelle.
4. Danach je nach Ergebnis: Republish bzw. gezielter Code-Fix, und erneut mit Log verifizieren.

## Technisch

Das Logging ist temporär und wird nach der Verifikation wieder entfernt bzw. auf eine Kurzfassung (nur `event_type` + erste Zeile) reduziert, damit keine Klartext-Inhalte dauerhaft in den Logs landen.
