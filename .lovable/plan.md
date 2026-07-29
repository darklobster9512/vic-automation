## /admin Übersicht neu strukturieren

Alle bisherigen Daten bleiben erhalten — sie werden nur klarer gruppiert, statt als 5 Kacheln + 3 volle Blöcke + 4 Listen untereinander.

### Aktuelles Problem

Die Seite zeigt heute neun gleichwertige Blöcke in vertikaler Reihenfolge: 5 Statistik-Kacheln, dann „Bevorstehende Startdaten", „Probetage", „Wartende Idents" jeweils volle Breite, dann vier Listen in zwei Spalten. Nichts hat Priorität, alles konkurriert.

### Neuer Aufbau

```text
┌─ Kopf: Willkommen zurück · Datum ─────────────────────────┐

┌─ Aktionsleiste (nur was JETZT Aufmerksamkeit braucht) ────┐
│ 3 neue Bewerbungen · 2 Verträge prüfen · 5 Chats · 1 Ident │
└───────────────────────────────────────────────────────────┘

┌─ HEUTE (2/3 Breite) ──────────┐ ┌─ Kennzahlen (1/3) ─────┐
│ Tab: Gespräche | Auftragstermine│ │ Neue Bewerbungen    3  │
│  09:00  Max Muster    [Status] │ │ Gespräche heute     4  │
│  11:30  Anna Klein    [Status] │ │ Offene Verträge     2  │
│ (leer → freundlicher Hinweis)  │ │ Termine heute       1  │
└────────────────────────────────┘ │ Ungelesene Chats    5  │
                                   └────────────────────────┘
┌─ Zu erledigen ────────────────┐ ┌─ Neueste Bewerbungen ──┐
│ Tab: Verträge | Idents        │ │ Name · Status · Datum  │
└───────────────────────────────┘ └────────────────────────┘

┌─ Kommende Termine ────────────────────────────────────────┐
│ Tab: Startdaten | Probetage                                │
└───────────────────────────────────────────────────────────┘
```

### Was wo landet (nichts geht verloren)

| Bisher | Neu |
|---|---|
| 5 Stat-Kacheln | Kompakte Kennzahlen-Liste rechts, jede Zeile weiterhin klickbar zum jeweiligen Bereich |
| Heutige Gespräche | Block „Heute", Tab 1 |
| Heutige Auftragstermine | Block „Heute", Tab 2 |
| Eingereichte Verträge | Block „Zu erledigen", Tab „Verträge" |
| Wartende Idents | Block „Zu erledigen", Tab „Idents" |
| Neueste Bewerbungen | Eigene Karte, unverändert im Inhalt |
| Bevorstehende Startdaten | Block „Kommende Termine", Tab 1 |
| Probetage | Block „Kommende Termine", Tab 2 |

Zusätzlich oben eine schmale Aktionsleiste, die nur Punkte mit Zahl > 0 als anklickbare Chips zeigt — bei ruhigem Tag verschwindet sie ganz.

### Gestaltung

- Bestehender Premium-Card-Stil und die vorhandenen `--stat-*` Farbtokens bleiben; keine neuen Farben.
- Statt fünf großer bunter Kacheln nur noch dezente Farbpunkte pro Kennzahl — deutlich ruhigeres Bild.
- Einheitliche Zeilendarstellung in allen Listen: Uhrzeit/Initialen links, Name mittig, Status/Zeit rechts.
- Jede Karte bekommt oben rechts einen „Alle ansehen"-Link zum jeweiligen Unterbereich.
- Leerzustände mit Icon und kurzem Satz statt nacktem Text.
- Gestaffelte Einblend-Animation wie bisher, aber nur einmal pro Sektion statt pro Kachel.

### Technisch

- `src/pages/admin/AdminDashboard.tsx` wird neu aufgebaut. Alle bestehenden Queries (Counts, Listen) bleiben inhaltlich unverändert inklusive `activeBrandingId`-Filter und Refetch-Intervallen.
- `UpcomingStartDates`, `UpcomingTrialDays`, `WaitingIdents` behalten ihre Datenlogik; sie werden so angepasst, dass sie ohne eigene Überschrift/Karte gerendert werden können und in die neuen Tab-Container passen (Prop `embedded`).
- Neue kleine Präsentationskomponenten unter `src/components/admin/dashboard/`: `MetricList`, `DashboardSection` (Karte mit Titel, optionalen Tabs und „Alle ansehen"), `EmptyState`.
- Rein Frontend; keine Datenbank- oder Query-Änderungen.
