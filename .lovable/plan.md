# Neuen Chat starten (/admin/livechat)

## Ziel

Neben dem Suchfeld „Mitarbeiter suchen…" ein **+ Button**, über den man einen Chat mit Mitarbeitern beginnen kann, die noch nie eine Nachricht geschrieben/erhalten haben.

## Verhalten

1. **+ Button** rechts neben dem Suchfeld in der Konversationsliste.
2. Klick öffnet einen Dialog „Neuen Chat starten":
   - eigenes Suchfeld (Vor-/Nachname)
   - Liste aller Mitarbeiter des aktiven Brandings, die **noch keine Konversation** haben (also nicht bereits in der linken Liste stehen)
   - Einträge ohne Namen werden ausgeblendet
3. Klick auf einen Mitarbeiter: Dialog schließt, die Person wird als aktive Konversation geöffnet (leerer Verlauf), oben in der Liste eingefügt und man kann direkt schreiben.
4. Sobald die erste Nachricht gesendet ist, verhält sich der Eintrag wie jede andere Konversation.

## Technische Details

- `src/components/chat/ConversationList.tsx`: neue optionale Prop `onNewChat`; Header wird zu Flex-Zeile mit Suchfeld + Icon-Button (`Plus`, `variant="outline"`, `size="icon"`, `rounded-xl`).
- `src/pages/admin/AdminLivechat.tsx`:
  - neuer State `newChatOpen` + Dialog-Komponente (shadcn `Dialog` + `Command`/einfache gefilterte Liste).
  - Query lädt `employment_contracts` (`id, first_name, last_name`) für `activeBrandingId` mit der bestehenden `.range()`-Batch-Schleife (1000-Zeilen-Limit) und filtert clientseitig alle `contract_id`s heraus, die schon in `conversations` sind.
  - Auswahl erzeugt ein `Conversation`-Objekt mit `last_message: ""`, `last_message_at: new Date().toISOString()`, `unread_count: 0`, hängt es an `conversations` und setzt `active`.
- Kein Datenbank- oder Backend-Change nötig; leere Konversationen sind rein clientseitig, bis die erste Nachricht existiert.
