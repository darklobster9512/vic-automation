In `src/pages/admin/AdminAuftraege.tsx` oberhalb der Liste (unter der Suchleiste) eine Tab-Leiste einfügen zum Filtern nach `order_type`.

Tabs (shadcn `Tabs`):
- Alle
- Bankdrop
- Exchanger
- Platzhalter
- Andere

Umsetzung:
- Neuer State `typeFilter: "alle" | "bankdrop" | "exchanger" | "platzhalter" | "andere"` (default `"alle"`).
- Zusätzlich zum bestehenden Such-Filter wird `filteredOrders` nach `typeFilter` gefiltert (`o.order_type === typeFilter` außer bei `"alle"`).
- Jeder Tab-Trigger zeigt einen kleinen Count-Badge mit der Anzahl der Aufträge in diesem Typ.
- Leerer Zustand bleibt erhalten (bei 0 gefilterten: „Keine Aufträge in dieser Kategorie").

Rein UI/Filter-Änderung, keine Datenlogik-Änderung.