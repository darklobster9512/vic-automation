# BD Status – Übersicht unter /admin/bd-status

Neue Admin-Seite, die auf einen Blick zeigt, welche aktiven Mitarbeiter welche Bankdrop-/Exchanger-Aufträge zugewiesen haben, in welchem Bearbeitungsstand diese sind und seit wann.

## Inhalt der Seite

- Nur Mitarbeiter des aktiven Brandings, die **nicht gesperrt** sind (`is_suspended = false`).
- Nur Zuweisungen zu Aufträgen vom Typ **Bankdrop** oder **Exchanger**.
- Gruppierung: eine Karte pro Mitarbeiter, darin eine Zeile pro Auftrag (mehrere Aufträge werden alle einzeln aufgelistet).

Pro Auftragszeile:
- Auftragstitel + Typ-Badge (Bankdrop / Exchanger)
- Zuweisungsdatum (Datum + Uhrzeit)
- Status-Badge (siehe unten)
- Link zur Mitarbeiter-Detailseite über den Namen

## Statuslogik (kombiniert aus mehreren Quellen)

Der angezeigte Status wird aus dem jeweils "weitesten" Fortschritt abgeleitet:

```text
Bewertung genehmigt      -> assignment.status = erfolgreich
Bewertung in Prüfung     -> assignment.status = in_pruefung
Fehlgeschlagen           -> assignment.status = fehlgeschlagen
Anhänge eingereicht      -> mind. ein Anhang mit Status "eingereicht"
Anhänge abgelehnt        -> mind. ein Anhang "abgelehnt"
Warte auf Anhänge        -> Auftrag verlangt Anhänge, aber keine/nur Entwürfe
Ident abgeschlossen      -> ident_session completed
Ident läuft / wartet     -> ident_session waiting bzw. data_sent
Ident abgebrochen        -> ident_session cancelled
Offen                    -> nichts davon
```

Zusätzlich als kleine Zusatzinfo je Zeile: Anzahl genehmigter/eingereichter Anhänge und ob die Bewertung freigeschaltet ist (`review_unlocked`).

## Filter und Übersicht oben

- Suchfeld (Name, Auftrag)
- Tabs/Filter: Alle / Bankdrop / Exchanger
- Statusfilter (Dropdown)
- Kennzahlen-Zeile: Anzahl Mitarbeiter, Anzahl Zuweisungen, offene Anhänge, laufende Idents

## Technische Umsetzung

- Neue Datei `src/pages/admin/AdminBdStatus.tsx`.
- Route `/admin/bd-status` in `src/App.tsx` (innerhalb des Admin-Layouts, wie `/admin/auftragsverteilung`).
- Sidebar-Eintrag "BD Status" in `src/components/admin/AdminSidebar.tsx` unter der Gruppe "Betrieb".
- Datenabruf mit React Query, gefiltert über `activeBrandingId` aus `useBrandingFilter`:
  1. `orders` mit `order_type in ('bankdrop','exchanger')` für das Branding
  2. `order_assignments` zu diesen Order-IDs (inkl. `assigned_at`, `status`, `review_unlocked`)
  3. `employment_contracts` der beteiligten `contract_id`s, gefiltert auf `is_suspended = false`
  4. `order_attachments` und `ident_sessions` zu den Paaren Auftrag/Mitarbeiter
- Batch-Abfragen mit `.in(...)` und `.range()`-Schleifen, um das 1000-Zeilen-Limit zu umgehen.
- Styling analog zu den bestehenden Admin-Seiten (Premium-Card-Layout, Badges, sticky Kopfbereich); keine Datenbank- oder Backend-Änderungen nötig.
