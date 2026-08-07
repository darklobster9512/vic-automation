## Ziel
Auf `/admin/erster-arbeitstag` soll der Name in der Tabelle anklickbar sein und zur Mitarbeiter-Detailseite des zugehörigen Mitarbeiters führen.

## Umsetzung
1. Den vorhandenen Vertragsdatensatz des Termins (`employment_contracts.id`) als Ziel-ID verwenden, da die bestehende Admin-Route `/admin/mitarbeiter/:id` genau diese Vertrags-ID lädt.
2. In `AdminErsterArbeitstag.tsx` die Navigation über React Router ergänzen.
3. Die Namenszelle als semantisch klickbares Navigationselement darstellen, mit sichtbarem Hover-Zustand und ohne Änderung an der bestehenden Namensauflösung.
4. Für Einträge ohne verknüpften Vertrag keine Navigation auslösen und den Namen weiterhin normal anzeigen.

## Prüfung
- Klick auf einen Namen öffnet `/admin/mitarbeiter/{vertrags-id}` des passenden Datensatzes.
- Die übrigen Tabellenaktionen, Suche, Statusänderungen und Löschfunktionen bleiben unverändert.
