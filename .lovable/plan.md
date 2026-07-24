## Änderung

In `src/components/chat/useChatRealtime.ts`:
- `.limit(500)` komplett entfernen
- Query wieder auf `ascending: true` stellen (natürliche chronologische Reihenfolge, kein `.reverse()` mehr nötig)

Damit lädt sowohl Admin-Livechat als auch Mitarbeiter-Widget **alle** Nachrichten der Conversation, ohne Limit.

## Hinweis

Beide Oberflächen nutzen denselben Hook – ein Change reicht für beide Seiten.