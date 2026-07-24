## Problem

Melanie Wolf-Busch hat 244 Chat-Nachrichten. Beim Öffnen des Chats werden aber nur die **ältesten 200** angezeigt – ihre neuen Nachrichten fehlen komplett.

## Ursache

In `src/components/chat/useChatRealtime.ts` lädt der Initial-Load:

```ts
.order("created_at", { ascending: true })
.limit(200);
```

Aufsteigend sortiert + Limit 200 = die **ersten** 200 Nachrichten (älteste). Alles ab Nachricht 201 (inkl. der neuesten) wird nie geladen. Neue Realtime-INSERTs kommen zwar rein, aber bereits gespeicherte Nachrichten oberhalb des Limits werden nie sichtbar.

Betrifft sowohl das Admin-Panel (`AdminLivechat`) als auch das Mitarbeiter-`ChatWidget`, da beide denselben Hook nutzen.

## Fix

In `src/components/chat/useChatRealtime.ts`, `load()`-Funktion:

1. Sortierung auf `ascending: false` umstellen und Limit auf **500** anheben, damit auch längere Konversationen komplett geladen werden.
2. Das Ergebnis clientseitig via `.reverse()` wieder in chronologische Reihenfolge bringen, bevor es in `setMessages` gesetzt wird.

So werden immer die 500 **neuesten** Nachrichten geladen und in gewohnter Reihenfolge (alt → neu, mit Auto-Scroll ans Ende) angezeigt.

Keine weiteren Änderungen nötig – Realtime-Subscription, Read-Marker und `sendMessage` bleiben identisch.
