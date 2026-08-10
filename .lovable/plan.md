# Bewerbungs-Queue beschleunigen und Countdown synchronisieren

Die Queue soll sich an echter Zeit orientieren: Eine Pause von 60 Sekunden soll nach 60 realen Sekunden enden, ohne dass React-Updates oder verschachtelte Timer die Wartezeit verlängern. Zusätzlich soll der Ablauf pro Bewerbung nicht unnötig länger als die eigentliche Verarbeitung dauern.

## Umsetzung

1. Die Countdown-Schleife in `AdminBewerbungen.tsx` auf eine absolute Deadline mit `Date.now()` umstellen. Die Anzeige wird nur anhand der verbleibenden Echtzeit aktualisiert; der nächste Queue-Schritt wird durch einen einzigen Timer bis zur Deadline ausgelöst. Dadurch entsteht kein Drift durch `setTimeout(1000)` plus Render-/Event-Loop-Verzögerungen.
2. Die Queue so strukturieren, dass die Pause zwischen den tatsächlichen Akzeptierungszeitpunkten gemessen wird und die Verarbeitungsdauer einer Bewerbung nicht zusätzlich als vollständige Extra-Pause aufgeschlagen wird.
3. Die Akzeptierungs-Mutation auf vermeidbare serielle Wartezeiten prüfen und nur unabhängige Schritte beschleunigen, ohne die bestehende Reihenfolge „Benachrichtigungen erfolgreich, dann Status ändern“ oder Fehlerbehandlung zu verändern.
4. Countdown, Fortschrittszähler und Abbrechen-Verhalten beibehalten; Timer beim Abbruch und beim Unmount sicher bereinigen.

## Validierung

- Mit einer kurzen Testpause prüfen, dass die nächste Bewerbung nach der eingestellten realen Zeit verarbeitet wird.
- Prüfen, dass der Countdown nicht langsamer läuft als die Uhr, der Zähler nach jeder Bewerbung aktualisiert wird und Abbrechen nach der laufenden Bewerbung stoppt.
- Prüfen, dass Einzel-Akzeptieren und Fehler-/Toast-Verhalten unverändert bleiben.

## Technische Details

- Änderungen ausschließlich in `src/pages/admin/AdminBewerbungen.tsx`.
- Keine Datenbankänderung und keine Änderung an der fachlichen Akzeptierungslogik.
