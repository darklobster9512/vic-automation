# Starterjobs: Prämie & Stunden auf 0 setzen

## Aktueller Stand
Alle 10 Starterjobs (je 2 pro Branding: Codebricks, for.tel, LIMEX, Vendis, Völler IT) haben bereits `reward = 0`, aber noch `estimated_hours = 0.5`.

## Änderung
Einmalige Datenbank-Aktualisierung über alle Starterjobs:
- `reward` auf `'0'` setzen (bereits erfüllt, zur Sicherheit inklusive)
- `estimated_hours` auf `'0'` setzen

## Technisch
```sql
UPDATE orders
SET reward = '0', estimated_hours = '0'
WHERE is_starter_job = true;
```

## Auswirkungen
- Mitarbeiter-Dashboard und `/mitarbeiter/auftraege` blenden Verdienst/Stunden bei Starterjobs dann komplett aus (bestehende Logik versteckt 0-Werte bereits).
- Keine Auswirkung auf bereits zugewiesene Aufträge, Bewertungen oder Auszahlungen — es werden nur die Anzeigewerte geändert.
