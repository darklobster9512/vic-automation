# Slot-1-Termine bei LIMEX auf Slot 2, 3 und 4 verteilen

Alle künftigen Bewerbungsgespräche des Brandings LIMEX Solutions, die aktuell in Slot 1 liegen, werden auf die Slots 2, 3 und 4 verteilt. Slot 1 bleibt danach für kommende Termine leer.

## Umfang

- Alle Termine ab heute (16.08.) bis einschließlich 08.09.
- Betroffen sind Termine mit Slot 1 sowie Termine ohne festen Slot, die in der Anzeige als Slot 1 (erster Eintrag der Uhrzeit) laufen.
- Insgesamt rund 55 Termine, davon 21 am Montag (17.08.).

## Verteilregeln

1. **Auslastung ausgleichen**: Pro Tag wandert jeder Termin in den Slot (2, 3 oder 4), der an diesem Tag die wenigsten Termine hat.
2. **Zeitfenster beachten**:
   - Slot 2: 09:00–16:00
   - Slot 3: 09:00–16:00
   - Slot 4: 08:00–14:00
   - Termine, die in kein Fenster passen (z.B. 16:20 und 16:40), gehen nach Slot 3 – dieser ist flexibel.
3. **Uhrzeit bleibt gleich** – außer die Uhrzeit ist im Ziel-Slot schon belegt. Dann wird der Termin um 10 Minuten nach hinten geschoben (bei weiterer Kollision in 10-Minuten-Schritten).
4. Keine E-Mails oder SMS – es werden nur Slot und ggf. Uhrzeit angepasst; die Bewerber bekommen keine Benachrichtigung.

## Ablauf

- Ist-Zustand je Tag ermitteln (Belegung Slot 2/3/4).
- Neue Zuordnung berechnen und als Übersicht (Name, Datum, alt → neu) auflisten.
- Datenänderung an den betroffenen Terminen ausführen (`slot_index`, bei Kollision `appointment_time`).
- Ergebnis prüfen: keine Doppelbelegung, Slot 1 künftig leer.

## Technisches

- Tabelle `interview_appointments`: Update von `slot_index` und ggf. `appointment_time`.
- Termine ohne `slot_index` bekommen einen expliziten Slot, damit die dynamische Reihenfolge (nach `created_at`) sie nicht wieder nach Slot 1 zieht.
- Keine Code- oder Schemaänderung nötig, reine Datenanpassung.
