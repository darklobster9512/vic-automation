# Kunden: Auftragsverteilung und BD Status freischalten

## Was sich ändert
- Kunden sehen im Menü die Reiter **Auftragsverteilung** und **BD Status** und können beide Seiten öffnen.
- Auf der Auftragsverteilung können Kunden für ihre eigenen Brandings die automatische Verteilung ein- und ausschalten, Sollwerte speichern und manuell verteilen.
- Caller sehen beide Reiter weiterhin nicht.

## Technische Details
- `AdminSidebar.tsx` und `AdminLayout.tsx`: Die bisher gemeinsame Sperrliste wird geteilt. `/admin/auftragsverteilung` und `/admin/bd-status` stehen nur noch auf der Caller-Liste.
- Datenbank: Die Rechte reichen schon aus. Kunden dürfen ihre Brandings ändern (Auto-Verteilung umschalten), Sollwerte für eigene Brandings verwalten, Verteilungsläufe lesen und Zuweisungen anlegen. Es ist keine Datenbankänderung nötig.
