# Lekkerland24-Auftrag in allen Brandings entfernen

## Gefundene Daten
Der Auftrag "Bewertung / Analyse Onlineshop Lekkerland24" existiert in 5 Brandings:

| Branding | Zuweisungen | Bewertungen |
|---|---|---|
| for.tel Solutions GmbH | 74 | 264 |
| LIMEX Solutions GmbH | 6 | 24 |
| Codebricks GmbH | 1 | 0 |
| Völler IT Solutions GmbH | 0 | 0 |
| Vendis Development Services GmbH | 0 | 0 |

Keine Anhänge, Ident-Sessions, Termine oder Erst-Arbeitstag-Vorbereitungen hängen daran.

## Vorgehen
Eine Datenlöschung (kein Code-Change) in dieser Reihenfolge:
1. Alle `order_reviews` zu diesen 5 Auftrags-IDs löschen (288 Einträge).
2. Alle `order_assignments` zu diesen Aufträgen löschen (81 Einträge).
3. Die 5 Aufträge selbst aus `orders` löschen.

Danach verschwindet der Auftrag aus `/admin/auftraege` und aus allen Mitarbeiter-Panels.

## Hinweis
Die 288 bereits abgegebenen Bewertungen zu diesem Auftrag gehen dabei unwiderruflich verloren. Falls sie erhalten bleiben sollen, kann stattdessen nur die Zuweisung entfernt und der Auftrag ausgeblendet werden — bitte kurz Bescheid geben.
