# SMS-Watcher: Fehlerflut in der Datenbank stoppen

## Was passiert

Die Log-Auswertung zeigt rund 22.000 Fehler vom Typ `duplicate key value violates unique constraint "sms_inbox_seen_unique"` innerhalb von etwa 10 Minuten — also mehrere tausend pro Minute.

Ursache: Der SMS-Watcher (`sms-inbox-watch`) versucht bei **jedem** Durchlauf für **jede** bereits bekannte SMS erneut einen Datensatz in `sms_inbox_seen` einzufügen, und nutzt den dabei entstehenden Unique-Fehler als "kenne ich schon"-Signal. Bei 4 Durchläufen pro Minute und über 1.000 gespeicherten Nachrichten erzeugt das genau diese Fehlerflut. Funktional ist nichts kaputt, aber die Datenbank-Logs laufen voll und jeder fehlgeschlagene Insert kostet unnötig Last.

## Lösung

1. **Nicht mehr blind einfügen.** Pro Nummer/Quelle werden die bereits gespeicherten Nachrichten-Hashes einmalig gelesen und im Speicher verglichen. Nur wirklich neue Nachrichten werden geschrieben — keine absichtlich fehlschlagenden Inserts mehr.
2. **Neue Einträge konfliktfrei schreiben:** Insert mit "bei Konflikt ignorieren", damit auch bei parallelen Läufen kein Fehler im Log landet.
3. **Nur relevante Daten laden:** Beim Hash-Abgleich wird pro Quelle nur ein begrenztes, aktuelles Fenster gelesen, damit der Abgleich schnell bleibt.
4. **Altbestand aufräumen (optional):** Einträge in `sms_inbox_seen`, die älter als 30 Tage sind, können regelmäßig gelöscht werden, damit die Tabelle nicht unbegrenzt wächst.

## Technische Details

- Datei: `supabase/functions/sms-inbox-watch/index.ts`
- `markSeen()` wird ersetzt durch: `loadSeenHashes(provider, sourceKey)` (ein `select message_hash` pro Quelle und Durchlauf) plus einen gesammelten Insert der neuen Zeilen mit `upsert(..., { onConflict: "…", ignoreDuplicates: true })`.
- Die Frische-Prüfung (`isFresh`, 60-Minuten-Fenster) und die Telegram-Weiterleitung bleiben unverändert.
- Keine Schema-Änderung nötig; der Unique-Index bleibt als Sicherheitsnetz bestehen.

## Ergebnis

Die Datenbank-Logs sind wieder sauber, die Last des Watchers sinkt deutlich, und die Telegram-Weiterleitung funktioniert unverändert weiter.
