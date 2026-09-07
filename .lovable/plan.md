# 1. Arbeitstag-Termine nachträglich auf "erfolgreich" setzen

Für die Brandings LIMEX, Codebricks und Vendis werden vergangene Termine zum 1. Arbeitstag auf "erfolgreich" gesetzt, wenn der Mitarbeiter mindestens eine Bewertung zu einem echten Auftrag abgegeben hat (Starterjobs und Platzhalter zählen nicht).

## Aktueller Stand (geprüft)
Alle vergangenen Termine dieser drei Brandings stehen aktuell auf Status "offen" (das entspricht "Neu" in der Übersicht):

| Branding | Vergangene Termine | Davon mit passender Bewertung |
|---|---|---|
| LIMEX Solutions | 200 | 116 |
| Codebricks | 59 | 41 |
| Vendis Development Services | 8 | 3 |

## Was passiert
- 160 Termine werden auf "erfolgreich" gesetzt.
- Die restlichen 107 bleiben unverändert auf "Neu".
- Zukünftige Termine bleiben unangetastet.
- Es werden keine SMS oder E-Mails versendet — reine Datenaktualisierung.

## Technisch
Ein einzelnes UPDATE auf `first_workday_appointments`:
- `appointment_date < current_date`
- Vertrag gehört zu einem der drei Brandings
- Status aktuell `offen`
- EXISTS-Bedingung: Eintrag in `order_reviews` für denselben `contract_id`, verknüpfter `orders`-Eintrag mit `is_starter_job = false` und `is_placeholder = false`

Danach Kontrollabfrage der neuen Statusverteilung.
