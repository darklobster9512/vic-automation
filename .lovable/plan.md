## Änderungen in `src/components/admin/AssignmentDialog.tsx`

### 1. Tab-Reihenfolge anpassen
Reihenfolge der Tabs ändern zu: **Offen · Zugewiesen · Testaufträge** (Testaufträge als 3. Tab).

### 2. "Alle auswählen" als Checkbox statt Button
Den Outline-Button oberhalb jeder Liste ersetzen durch eine kompakte Zeile:
- Links: `<Checkbox>` (indeterminate wenn teilweise ausgewählt, checked wenn alle sichtbaren ausgewählt).
- Rechts daneben Label-Text: `Alle auswählen (N)`.
- Klick auf Checkbox oder Label toggelt alle sichtbaren Einträge (gleiche Logik wie bisher).
- Dezent gestaltet, oberhalb der Liste, ohne Border/Button-Styling.