# Ident-Sessions aus den beiden Listen beenden

## Ausgangslage
- Aktuell sind 54 Ident-Sessions offen (47 "Daten gesendet", 7 "Wartet").
- Deine zwei Listen enthalten rund 40 davon (07.09.–02.10.2026). Neuere Sessions von heute stehen nicht in den Listen.

## Was gemacht wird
- Genau die Sessions aus beiden Listen werden auf "abgeschlossen" gesetzt (Abgleich über Mitarbeitername + Startzeitpunkt auf die Minute).
- Sie verschwinden aus "Ausstehend"/"Wartende Ident-Sessions" und landen im Archiv.
- Sessions, die nicht in den Listen stehen (z. B. die von heute), bleiben offen.
- Keine E-Mails, keine SMS, Auftragszuweisungen und Bewertungen bleiben unverändert.
- Danach Kontrolle: Anzahl beendet + Liste etwaiger Einträge, die nicht eindeutig zugeordnet werden konnten.

## Technische Details
- `UPDATE ident_sessions SET status='completed', completed_at=now(), updated_at=now()` für Sessions mit Status `waiting`/`data_sent`, deren `employment_contracts`-Name und `created_at` (Europe/Berlin, minutengenau) einem Listeneintrag entsprechen.
