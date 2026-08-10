# Queue mit Zufallspause beim Massen-Akzeptieren

Auf `/admin/bewerbungen` soll „Ausgewählte akzeptieren“ nicht mehr sofort alles hintereinander abfeuern, sondern als Warteschlange mit zufälligen Pausen laufen — inklusive sichtbarem Fortschritt am unteren Bildschirmrand.

## Ablauf

1. Mehrere Bewerbungen auswählen, „Ausgewählte akzeptieren“ klicken.
2. Ein Dialog öffnet sich mit zwei Eingabefeldern: „Pause von (Sekunden)“ und „bis (Sekunden)“, Standard 60 und 100. Anzeige der Anzahl ausgewählter Bewerbungen und der geschätzten Gesamtdauer.
3. Bestätigen startet die Queue: erste Bewerbung sofort, danach vor jeder weiteren eine zufällige Wartezeit zwischen den beiden Werten.
4. Unten im Bild erscheint eine fixierte Fortschrittsleiste: „3 / 20 akzeptiert“, Fortschrittsbalken, Countdown bis zur nächsten Bewerbung („nächste in 47s“), Fehlerzähler und ein „Abbrechen“-Button, der die Queue nach der laufenden Bewerbung stoppt.
5. Nach Abschluss: Toast mit Erfolgs-/Fehleranzahl, Auswahl wird geleert, Leiste verschwindet.

## Validierung

- Beide Felder nur ganze Zahlen ≥ 0, „von“ darf nicht größer als „bis“ sein; sonst Start blockiert mit Hinweis.
- Der bestehende Einzel-Akzeptieren-Button bleibt unverändert (keine Pause).

## Technische Details

- Datei: `src/pages/admin/AdminBewerbungen.tsx` (rein Frontend, keine DB-Änderung).
- Neuer State: `bulkDialogOpen`, `delayMin`, `delayMax`, erweitertes `bulkProcessing` um `success`, `errors`, `nextInSeconds`, `cancelled` (Cancel via `useRef`-Flag).
- Queue-Schleife nutzt weiterhin `acceptMutation.mutateAsync` pro Bewerbung; zwischen den Durchläufen ein `await` auf ein Promise mit `setTimeout`, das den Countdown im Sekundentakt herunterzählt und das Cancel-Flag prüft (Timer beim Unmount aufräumen).
- Fortschrittsanzeige als fixiertes Panel (`fixed bottom-…`, semantische Tokens, `Progress`-Komponente) statt nur der bestehenden Leiste in der Tabelle; die vorhandene Inline-Leiste zeigt weiterhin die Auswahl-Aktionen.
- Dialog über die vorhandene shadcn-`Dialog`-Komponente, Eingaben als `Input type="number"`.
