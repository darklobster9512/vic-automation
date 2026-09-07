# Arbeitsverträge mit 1.-Arbeitstag-Termin auf „Genehmigt" setzen

## Ziel
Jeder Mitarbeiter, der einen Termin für den 1. Arbeitstag hatte, soll den Vertragsstatus „Genehmigt" erhalten.

## Ausgangslage (geprüft)
- 300 Verträge mit 1.-Arbeitstag-Termin stehen auf `eingereicht`:
  - LIMEX Solutions GmbH: 216
  - Codebricks GmbH: 70
  - Vendis Development Services GmbH: 14

## Umsetzung
- Einmaliges SQL-Update: `employment_contracts.status = 'genehmigt'` für alle Verträge, die einen Eintrag in `first_workday_appointments` haben (alle Brandings, nicht nur die drei genannten — Sicherheitsabfrage über die ganze Tabelle).
- Zusätzlich `accepted_at`-Zeitstempel der zugehörigen Bewerbung wird nicht verändert; keine SMS/E-Mail wird versendet (reines Status-Update).
- Verifikation: Anschließende Zählung je Branding/Status muss 0 × `eingereicht` mit Termin ergeben.

## Technische Details
```sql
UPDATE public.employment_contracts
SET status = 'genehmigt'
WHERE id IN (SELECT contract_id FROM public.first_workday_appointments WHERE contract_id IS NOT NULL)
  AND status <> 'genehmigt';
```
