# Gehaltsanzeige aus dem zugewiesenen Arbeitsvertrag

## Problem (geprüft)

Die Karte "Gehaltsauszahlung" und die Kachel "Festgehalt" im Mitarbeiterbereich lesen den Betrag aus den Branding-Einstellungen, nicht aus dem zugewiesenen Vertrag:

- 264 Mitarbeiter haben keine hinterlegte Anstellungsart -> der Branding-Wert greift nicht -> 0,00 €.
- 106 weitere haben zwar eine Vertragsvorlage (2.987 €), aber keine Anstellungsart -> ebenfalls 0,00 €.
- Selbst wo es passt, weicht der Branding-Wert ab: Teilzeit steht dort mit 1.206 €, die zugewiesene 25-Std.-Vorlage hat aber 2.987 €.

Die zugewiesenen Verträge enthalten das korrekte Gehalt: Minijob 5 Std. = 603 €, Teilzeit 25 Std. = 2.987 €.

## Lösung

Das Gehalt kommt künftig immer zuerst aus dem zugewiesenen Arbeitsvertrag. Nur wenn kein Vertrag zugewiesen ist, wird auf den Branding-Wert der Anstellungsart zurückgegriffen.

Betroffene Anzeigen:
- Mitarbeiter-Startseite: Kachel "Festgehalt" und Karte "Gehaltsauszahlung"
- "Meine Daten": Gehaltsanzeige

Zeigt ein Mitarbeiter weder Vertrag noch Anstellungsart, wird statt "0,00 €" ein neutrales "–" mit dem Hinweis "Noch kein Vertrag zugewiesen" angezeigt.

## Technisches

- `src/pages/mitarbeiter/MitarbeiterDashboard.tsx`: `getFixedSalary()` priorisiert den bereits geladenen `templateSalary` (aus `contract_templates.salary` über `employment_contracts.template_id`); Branding-Werte nur als Fallback. Gleiches gilt für den an `DashboardPayoutSummary` übergebenen Betrag.
- `src/pages/mitarbeiter/MeineDaten.tsx`: identische Priorisierung in `getFixedSalary()`.
- `src/components/mitarbeiter/DashboardPayoutSummary.tsx`: optionaler Zustand "kein Betrag verfügbar" statt 0,00 €.
- Reine Anzeige-Änderung, keine Datenbank- oder Vertragsdaten werden verändert.
