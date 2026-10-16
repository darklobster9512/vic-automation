# Problem-Aufträge in allen Brandings löschen

## Was gelöscht wird
Alle Aufträge "Bewertung / Analyse Onlineshop ..." für: Brand, Peaktime, Heinrich-Handel, Zwillingsherz, Boden, Hema, Glamour, Adler, Outletcity, Reserved, Sonepar – in allen Brandings.

- 108 Aufträge
- dazu 1.140 Zuweisungen (davon 589 bereits erfolgreich erledigt)
- 2.353 Bewertungen, sowie zugehörige Anhänge und Bewertungs-Entwürfe

Queedo gibt es als Auftrag nicht – da wird nichts gelöscht.
Deutsche Bank und BBVA bleiben unangetastet.

## Wichtig
- Erledigte Aufträge und Bewertungen der Mitarbeiter verschwinden aus deren Übersicht und Bewertungsliste. Das lässt sich nicht rückgängig machen.
- Es gehen keine E-Mails, SMS oder Telegram-Nachrichten raus.

## Ablauf
1. Abhängige Einträge (Bewertungen, Entwürfe, Anhänge, Termine, Zuweisungen) zu diesen 108 Aufträgen löschen.
2. Die 108 Aufträge löschen.
3. Nachprüfen, dass keiner der 11 Shops mehr existiert und Deutsche Bank/BBVA unverändert sind.

## Technische Details
Auswahl per `orders.title ~* 'Onlineshop\s*[-–]?\s*(Brand|Peaktime|Heinrich-Handel|Zwillingsherz|Boden|Hema|Glamour|Adler|Outletcity|Reserved|Sonepar)\s*$'`; Löschung in einer Transaktion über `order_reviews`, `order_review_drafts`, `order_attachments`, `order_appointments`, `first_workday_preparations.order_id`/`ident_sessions.order_id` (auf NULL), `order_assignments`, dann `orders`.
