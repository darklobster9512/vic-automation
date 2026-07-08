## Änderungen in `src/components/admin/AssignmentDialog.tsx`

### 1. "Alle auswählen"-Button je Tab
Über jeder Liste (Offen / Zugewiesen / Testaufträge) einen kleinen Button hinzufügen:
- Wählt alle aktuell im Tab sichtbaren (nach Suche gefilterten) Mitarbeiter aus.
- Falls bereits alle ausgewählt sind, wird der Button zu "Alle abwählen" und entfernt die Auswahl der sichtbaren Einträge.
- Wirkt nur auf den aktiven Tab, überschreibt keine anderen Tabs.

### 2. Neuer Tab "Testaufträge"
Zusätzlich zu "Offen" und "Zugewiesen" ein dritter Tab (nur bei `mode="order"`):
- Zeigt alle Mitarbeiter, die genau **2 zugewiesene Aufträge** haben (`assignmentCounts[id] === 2`).
- Ausgeschlossen: bereits diesem Auftrag zugewiesene (die bleiben im "Zugewiesen"-Tab).
- Diese Mitarbeiter werden aus dem "Offen"-Tab entfernt (Filter: `assignmentCounts[id] !== 2`).
- Tab-Header zeigt Anzahl: `Testaufträge (X)`.

### Logik zur Filterung

```text
openItems      = filteredItems.filter(i => !existingIds.has(i.id) && (counts[i.id] ?? 0) !== 2)
testItems      = filteredItems.filter(i => !existingIds.has(i.id) && (counts[i.id] ?? 0) === 2)
assignedItems  = filteredItems.filter(i =>  existingIds.has(i.id))
```

Damit sind Testauftrags-Mitarbeiter klar getrennt und werden nicht im Offen-Tab doppelt angezeigt.

Keine weiteren Änderungen an anderen Dateien nötig — `assignmentCounts` wird bereits im Dialog geladen.