# Idents abschließen + Völler-Bewertungen genehmigen

## Ausgangslage (geprüft)
- Die "Ausstehend"-Liste auf /admin/idents zeigt nicht nur gespeicherte Ident-Vorgänge, sondern jede Videochat-Auftragszuweisung, zu der noch gar kein Ident-Vorgang angelegt wurde. Genau die stehen bei dir auf ausstehend.
- Betroffen sind 256 Zuweisungen ohne Ident-Vorgang, davon 242 mit bereits abgegebener Bewertung: LIMEX 150, Codebricks 48, Völler IT 40, Vendis 3, for.tel 1.
- Die 68 bereits gespeicherten Ident-Vorgänge stehen alle auf abgeschlossen.
- Bei Völler IT sind 891 Bewertungen noch nicht freigegeben: 156 Starterjobs mit genehmigtem Arbeitsvertrag, 126 Starterjobs ohne genehmigten Vertrag, 609 Platzhalter/Sonstige.
- Alle Brandings laufen auf Festgehalt, es werden also keine Guthaben gutgeschrieben.

## Was gemacht wird

1. Idents abschließen (alle Brandings)
   - Für jede Videochat-Zuweisung mit vorhandener Bewertung wird ein Ident-Vorgang mit Status "abgeschlossen" angelegt (Zeitpunkt = Zeitpunkt der Bewertung).
   - Damit verschwinden diese Einträge aus "Ausstehend" und landen im Archiv "Abgeschlossen".
   - Zuweisungen ohne Bewertung bleiben unverändert in der Ausstehend-Liste.
   - Bereits vorhandene Ident-Vorgänge werden nicht angefasst.

2. Völler IT: Bewertungen genehmigen
   - Alle Platzhalter-Aufträge mit abgegebener Bewertung werden auf "erfolgreich" gesetzt.
   - Alle Starterjob-Aufträge mit abgegebener Bewertung werden auf "erfolgreich" gesetzt, aber nur wenn der Arbeitsvertrag des Mitarbeiters genehmigt ist.
   - Starterjobs von Mitarbeitern ohne genehmigten Vertrag bleiben unangetastet.
   - Es werden keine SMS und keine E-Mails verschickt.

## Technische Details
- `INSERT INTO ident_sessions (order_id, contract_id, assignment_id, branding_id, status, completed_at, created_at, updated_at)` für alle `order_assignments` auf `orders.is_videochat = true`, die keine Session haben und für die `order_reviews` existieren; `completed_at` = max. `created_at` der Bewertung; `test_data` leer.
- `UPDATE order_assignments SET status = 'erfolgreich'` für Völler-Verträge mit vorhandener Bewertung und (`orders.is_placeholder` oder `orders.is_starter_job` mit `employment_contracts.status = 'genehmigt'`).
- Kein Balance-Update (Festgehalt), keine Benachrichtigungs-Trigger betroffen.
