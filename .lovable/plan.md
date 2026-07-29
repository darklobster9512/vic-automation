## Mehrfachauswahl auf /admin/mitarbeiter

Ziel: Mitarbeiter per Checkbox auswählen und dann gesammelt sperren, entsperren oder löschen.

### Auswahl-UI

- Neue erste Spalte in der Tabelle mit einer Checkbox pro Zeile.
- Checkbox im Tabellenkopf wählt alle Einträge der **aktuellen Seite** aus (inkl. Zwischenzustand, wenn nur ein Teil ausgewählt ist).
- Auswahl wird als Set von Vertrags-IDs im State gehalten und automatisch geleert, wenn Seite, Suche oder Branding wechseln — so werden nie unsichtbare Einträge mitgelöscht.
- Klick auf die Checkbox löst keine Zeilennavigation aus.

### Aktionsleiste

Sobald mindestens ein Eintrag ausgewählt ist, erscheint über der Tabelle eine Leiste:

```text
[ 5 ausgewählt ]   [ Sperren ]  [ Entsperren ]  [ Löschen ]   [ Auswahl aufheben ]
```

- **Sperren / Entsperren**: setzt `is_suspended` für alle markierten Verträge in einem einzigen Update (`.in("id", ids)`).
- **Löschen**: ruft die bestehende `delete-employee` Edge Function nacheinander für jede ID auf (die Function nimmt eine einzelne `contractId`), mit Fortschrittsanzeige im Button und Fehlerzählung am Ende.

### Sicherheitsabfragen

- Sperren/Entsperren: kurzer Bestätigungsdialog mit Anzahl.
- Löschen: bestehender AlertDialog-Stil, Text angepasst auf „X Mitarbeiter endgültig löschen?" mit dem Hinweis, dass Vertragsdaten, Aufträge und Benutzerkonten unwiderruflich entfernt werden.

### Nach der Aktion

Toast mit Ergebnis (z. B. „5 gesperrt" bzw. „4 gelöscht, 1 fehlgeschlagen"), Auswahl zurücksetzen und `mitarbeiter`-Query invalidieren, damit die Tabelle aktualisiert.

### Technisch

Nur `src/pages/admin/AdminMitarbeiter.tsx` wird geändert; die vorhandenen Einzel-Aktionen (Auge, Schloss, Papierkorb) bleiben unverändert bestehen. Genutzt wird die vorhandene shadcn-`Checkbox`-Komponente. Keine Datenbank- oder Edge-Function-Änderungen nötig.
