# Idents abschließen + Völler-Bewertungen genehmigen

## Ausgangslage (geprüft)
- Es gibt insgesamt 68 Ident-Vorgänge (65 Völler IT, 3 for.tel) — alle stehen bereits auf "abgeschlossen". Es gibt aktuell keinen offenen Ident, der noch umgestellt werden müsste. Sollten später wieder offene Idents mit vorhandener Bewertung auftauchen, greift die unten beschriebene Regel.
- Bei Völler IT gibt es zu 891 Auftrags-Bewertungen noch keine Freigabe: 156 Starterjob-Bewertungen bei genehmigtem Arbeitsvertrag, 126 Starterjob-Bewertungen ohne genehmigten Vertrag (ausstehend/eingereicht) und 609 Platzhalter-/Sonstige mit Alt-Status "abgeschlossen".
- Alle Brandings laufen auf Festgehalt, es werden also keine Guthaben-Beträge gutgeschrieben.

## Was gemacht wird

1. Idents abschließen (alle Brandings)
   - Jeder Ident-Vorgang, zu dessen Mitarbeiter und Auftrag eine Bewertung vorliegt, wird auf "abgeschlossen" gesetzt (mit Abschlusszeitpunkt).
   - Nach aktuellem Stand ändert das nichts, da bereits alle Idents abgeschlossen sind — die Prüfung wird trotzdem durchgeführt und das Ergebnis gemeldet.

2. Völler IT: Bewertungen genehmigen
   - Alle Platzhalter-Aufträge mit abgegebener Bewertung werden auf "erfolgreich" gesetzt.
   - Alle Starterjob-Aufträge mit abgegebener Bewertung werden auf "erfolgreich" gesetzt, aber nur wenn der Arbeitsvertrag des Mitarbeiters genehmigt ist.
   - Starterjobs von Mitarbeitern mit noch nicht genehmigtem Vertrag bleiben unangetastet.
   - Es werden keine SMS und keine E-Mails verschickt — die Freigaben laufen direkt in der Datenbank.

## Technische Details
- `ident_sessions`: `status = 'completed'`, `completed_at = coalesce(completed_at, now())` für Sessions, zu denen ein Eintrag in `order_reviews` mit passendem `contract_id` (und, falls gesetzt, `order_id`) existiert.
- `order_assignments`: `status = 'erfolgreich'` für Völler-Verträge, wenn eine Bewertung existiert und (`orders.is_placeholder` = true und nicht Starterjob) oder (`orders.is_starter_job` = true und `employment_contracts.status = 'genehmigt'`).
- Kein Balance-Update nötig (Zahlungsmodell Festgehalt), keine Trigger für Benachrichtigungen betroffen.
