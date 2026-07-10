## 1. Suchleiste in `/admin/auftraege`

In `src/pages/admin/AdminAuftraege.tsx` ein `Input` mit Search-Icon oberhalb der Karten-Liste einfügen (unter dem Header). Client-seitiges Filtern der `orders`-Liste (case-insensitive) über `title`, `description` und `order_type`/`typeLabel`. Kein Query-Change, nur ein zusätzlicher `useState<string>` + `.filter()` vor dem `.map()`.

## 2. Zusatz-Buttons „Alle auswählen mit …h" im Zuweisungs-Popup (nur Tab „Offen")

In `src/components/admin/AssignmentDialog.tsx`:

- `renderList` bekommt einen optionalen Parameter `showHourFilters?: boolean`.
- Nur der Aufruf für den Tab „Offen" setzt `showHourFilters={true}`.
- Wenn aktiv, wird neben der bestehenden „Alle auswählen"-Checkbox eine kleine Button-Reihe gerendert:
  - `Alle mit ≥10h` — wählt alle sichtbaren Items aus, deren aus `templateTitle` per Regex `/(\d+)\s*Stunden/i` geparste Stundenzahl `>= 10` ist.
  - `Alle mit ≥20h` — analog `>= 20`.
- Klick setzt zusätzlich zur bestehenden Auswahl (union), analog zur bisherigen Toggle-Logik. Items ohne parsbare Stundenzahl werden ignoriert.
- Styling: `Button variant="outline" size="sm"` in einer Flex-Row rechts neben dem „Alle auswählen"-Label.

## Technisch

- Stundenparser identisch zur bestehenden Anzeige (Zeile 304): `item.templateTitle.match(/(\d+)\s*Stunden/i)`.
- Keine Änderungen an DB, RLS, Datenmodell oder anderen Tabs.
- Keine Änderung am „Testaufträge"- oder „Zugewiesen"-Tab.