# /admin/bewerbungen: Pagination + Sortierung

Statt alle Bewerbungen eines Tabs auf einmal zu rendern (for.tel: bis zu 1.009 Zeilen in einem Tab), wird die Tabelle seitenweise angezeigt. Das reduziert die Renderlast und damit das Lag.

## Änderungen

### 1. Pagination
- Pro Tab werden immer 50 Bewerbungen angezeigt.
- Unter der Tabelle eine Seiten-Navigation: Zurück / Weiter plus Seitenzahlen, dazu ein Hinweis wie "51–100 von 1009".
- Beim Wechsel des Tabs springt die Ansicht zurück auf Seite 1.

### 2. Sortierung
- Umschalter über der Tabelle: "Neueste zuerst" (Standard, wie bisher) oder "Älteste zuerst", bezogen auf das Eingangsdatum.
- Beim Wechsel der Sortierung springt die Ansicht zurück auf Seite 1.

Sonst bleibt alles unverändert: Auswahl, Massen-Akzeptieren mit Queue, Aktionen, Statistiken, Dialoge und Datenabfragen.

## Technische Details
- Datei: `src/pages/admin/AdminBewerbungen.tsx`, rein Frontend, keine Datenbank-Änderung.
- Neuer State `page` und `sortOrder`; Sortierung und Slicing clientseitig auf den bereits geladenen Daten via `useMemo`.
- "Alle auswählen" wirkt weiterhin auf alle neuen Bewerbungen, nicht nur die sichtbare Seite.
- Seiten-Navigation über die vorhandene shadcn-`Pagination`-Komponente, Sortier-Umschalter über `Select`.
