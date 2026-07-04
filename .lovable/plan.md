## Änderungen in `AdminTelefonnummern.tsx`

### 1. Provider-Tabs filtern die Tabelle
- Bisher schaltet der Anosim/SMSBot-Button nur das Add-Formular um.
- Neu: gleicher State (`provider`) filtert zusätzlich die Zeilen — `entries.filter(e => e.provider === provider)`.
- Auswahl bleibt in `localStorage` (`admin.telefonnummern.provider`) erhalten, damit ein Reload den letzten Tab wiederherstellt.

### 2. Pagination — 20 Nummern pro Seite
- State `page` (Startwert 1), Konstante `PAGE_SIZE = 20`.
- Reset auf Seite 1 bei Provider-Wechsel oder Branding-Wechsel.
- Slice: `filtered.slice((page-1)*20, page*20)`.
- Unter der Tabelle: schlichter Pager mit „Zurück / Weiter" + Anzeige „Seite X von Y (Z Nummern)". Bei ≤ 20 Ergebnissen wird der Pager ausgeblendet.
- Nutzt das existierende `@/components/ui/pagination`.

### Nicht betroffen
- Datenbank, Edge Functions, `SmsWatch`.
- Add-Flow selbst (Formular verhält sich weiter wie gehabt, nur die Tabellenansicht wird gefiltert).