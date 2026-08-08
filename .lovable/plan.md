# BD Status – Platzhalter-Zähler und Vertragsinfos

Erweiterung der Seite `/admin/bd-status`.

## Neue Zeile: Platzhalteraufträge seit Zuweisung

Unter dem "Zugewiesen am"-Zeitstempel jedes Bankdrop-/Exchanger-Auftrags steht künftig:

```text
Danach 7 Platzhalteraufträge zugewiesen
```

Zählweise pro Mitarbeiter:
- Gezählt werden alle Platzhalter-Zuweisungen, die **nach** diesem BD/Exchanger-Auftrag und **vor** dem nächsten BD/Exchanger-Auftrag desselben Mitarbeiters liegen (Zeitfenster über `assigned_at`).
- Beim jeweils neuesten BD/Exchanger-Auftrag zählt das Fenster bis heute und wächst automatisch mit jeder neuen Platzhalter-Zuweisung.
- Kommt ein neuer BD/Exchanger-Auftrag dazu, friert der Wert beim vorherigen Auftrag automatisch ein (das Fenster endet dort) und beim neuen Auftrag beginnt die Zählung wieder bei 0.
- Bei 0 wird "Noch keine Platzhalteraufträge danach" angezeigt.

Da der Wert aus den Zeitstempeln berechnet wird, bleibt er ohne zusätzliche Speicherung dauerhaft korrekt.

## Karte pro Mitarbeiter

Bleibt genau eine Karte pro Mitarbeiter (wie jetzt), mit allen seinen BD/Exchanger-Aufträgen darin. Im Karten-Kopf kommen zusätzlich:

- **Startdatum**: `desired_start_date` des Arbeitsvertrags (formatiert `dd.MM.yyyy`, sonst "kein Startdatum").
- **Vertrag/Stunden**: Titel der zugewiesenen Vertragsvorlage (z. B. "Teilzeit – 20 Stunden/Woche"); falls keine Vorlage gesetzt ist, Fallback auf `employment_type` des Vertrags.

Darstellung als kleine Badges/Zeile unter dem Namen neben der bisherigen Auftragsanzahl.

## Technische Umsetzung

In `src/pages/admin/AdminBdStatus.tsx`:
- Vertragsabfrage um `desired_start_date`, `employment_type`, `template_id` erweitern; passende `contract_templates` (id, title, employment_type) nachladen und zuordnen.
- Zusätzlich alle Zuweisungen der relevanten Mitarbeiter laden (`order_assignments` per `contract_id`), zugehörige Aufträge auf `is_placeholder = true` bzw. `order_type = 'platzhalter'` prüfen und die Zeitstempel je Mitarbeiter sammeln.
- Pro Mitarbeiter die BD/Exchanger-Zuweisungen chronologisch sortieren und für jedes Fenster `[assigned_at, nächster BD assigned_at)` die Platzhalter-Zuweisungen zählen.
- Batch-Abfragen weiterhin über die vorhandene `fetchAllIn`-Hilfsfunktion (Chunking + `.range()`).
- Keine Datenbankänderungen nötig.
