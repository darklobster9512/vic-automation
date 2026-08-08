# Auftragsverteilung – tägliche Zuweisung mit Übersicht

Neue Admin-Seite `/admin/auftragsverteilung`, die die tägliche Verteilung von Platzhalteraufträgen pro Vertragstyp steuert, protokolliert und den Tagesstatus anzeigt. Zusätzlich werden Benachrichtigungen (E-Mail/SMS) zu einer Sammelnachricht zusammengefasst.

## 1. Neue Seite + Sidebar-Eintrag

- Sidebar (Bereich „Verwaltung"): neuer Punkt „Auftragsverteilung" mit Route `/admin/auftragsverteilung`.
- Seite respektiert den aktiven Branding-Filter wie die anderen Admin-Seiten.

## 2. Tabs pro Vertragsstunden

Tabs werden dynamisch aus den aktiven Vertragsvorlagen des Brandings erzeugt (Stundenzahl wird aus dem Titel gelesen, z. B. „Teilzeit – 25 Stunden/Woche" → 25 h). Aktuell vorhanden: 5, 10, 20, 25 und – bei einem Branding – 30 Stunden.

Soll-Aufträge pro Werktag:

| Stunden | Aufträge/Tag |
|---|---|
| 5 | 2 |
| 10 | 3 |
| 20 | 3 |
| 25 | 4 |
| sonstige (z. B. 30) | 4, im UI editierbar |

Die Sollwerte stehen sichtbar oben im Tab und lassen sich pro Tab anpassen (Speicherung pro Branding, s. Technik).

## 3. Mitarbeiterliste je Tab

Angezeigt werden nur Mitarbeiter, die alle Bedingungen erfüllen:

- Vertrag gehört zum aktiven Branding und hat die Vorlage mit der Stundenzahl des Tabs
- `desired_start_date` liegt heute oder in der Vergangenheit
- Der Termin „1. Arbeitstag" ist auf **Erfolgreich** gesetzt
- Mitarbeiter ist nicht gesperrt (`is_suspended = false`)

Pro Zeile: Name, Startdatum, Anzahl bereits zugewiesener Aufträge, Anzahl heute zugewiesener Aufträge, verbleibende freie Platzhalteraufträge, Status-Badge (heute erledigt / offen / keine Aufträge mehr verfügbar).

## 4. Zuweisen-Button + Vorschau-Popup

Button „Aufträge zuweisen" pro Tab. Im Popup:

- Liste aller Mitarbeiter des Tabs mit den konkret vorgeschlagenen Platzhalteraufträgen (Titel + Auftragsnummer).
- Auswahl **nur** aus Aufträgen mit `is_placeholder = true` des Brandings.
- Zufällige Auswahl; ausgeschlossen sind alle Aufträge, die dem Mitarbeiter bereits (jemals) zugewiesen waren.
- Reichen die freien Platzhalteraufträge nicht, wird das pro Mitarbeiter deutlich markiert („nur 1 von 3 möglich" / „keine Platzhalteraufträge mehr verfügbar") inkl. Hinweis, neue Platzhalteraufträge anzulegen.
- Mitarbeiter können vor dem Bestätigen einzeln abgewählt werden; „Neu würfeln" erzeugt einen neuen Vorschlag.
- Bestätigen legt die Zuweisungen an und löst genau eine Benachrichtigung pro Mitarbeiter aus.

## 5. Tagesstatus / Bestätigung

Oben auf der Seite eine Statusleiste für den heutigen Tag:

- Grün: „Heute wurden alle Mitarbeiter versorgt (n von n)."
- Gelb: Liste der Mitarbeiter, die heute noch keine (oder zu wenige) Aufträge bekommen haben – inklusive Sprung zum jeweiligen Tab.
- Berechnung erfolgt live aus `order_assignments.assigned_at` des heutigen Tages, es wird also auch erkannt, wenn ein Mitarbeiter erst später neu in der Liste auftaucht.

## 6. Benachrichtigungen überarbeiten

- Eine E-Mail pro Mitarbeiter und Zuweisungsvorgang statt einer Mail pro Auftrag.
- Bei mehreren Aufträgen Plural-Text mit Auflistung aller Aufträge; bei einem Auftrag Singular.
- Der Satz zur Terminbuchung entfällt; stattdessen: einloggen und Aufträge bearbeiten.
- SMS: bei mehreren Aufträgen die vorhandene Sammel-SMS `auftraege_zugewiesen_sammel`, bei einem Auftrag `auftrag_zugewiesen`. Nie mehrere SMS hintereinander.
- Die Vorschau unter `/admin/emails` wird an den neuen Text angepasst.

## Zusätzliche Vorschläge (optional, sag Bescheid was du willst)

1. **Alles-auf-einmal-Button**: ein Button oben, der alle Tabs auf einmal verteilt (ein Popup, gruppiert nach Stunden).
2. **Wochenend-Sperre**: an Samstag/Sonntag Warnhinweis „heute kein Betrieb" statt normaler Verteilung.
3. **Verlauf**: kleine Historie der letzten 7 Tage (wie viele Aufträge pro Tag verteilt wurden), um Lücken zu erkennen.
4. **Platzhalter-Vorrat-Warnung**: Hinweis, wenn im Branding weniger als X freie Platzhalteraufträge übrig sind.

## Technische Details

- Neue Datei `src/pages/admin/AdminAuftragsverteilung.tsx` plus Dialog-Komponente `src/components/admin/DistributionDialog.tsx`; Route in `src/App.tsx`, Eintrag in `src/components/admin/AdminSidebar.tsx`.
- Datenquellen: `employment_contracts` (+ `contract_templates.title` für Stunden), `first_workday_appointments.status = 'erfolgreich'`, `orders` mit `is_placeholder = true`, `order_assignments` (inkl. `assigned_at` für „heute").
- Abfragen mit `.range()`-Batching, um das 1000-Zeilen-Limit zu umgehen.
- Sollwerte pro Stundenstufe: neue Tabelle `distribution_targets` (branding_id, hours, orders_per_day) mit GRANTs und RLS analog zu bestehenden Branding-Tabellen; Defaults 5→2, 10→3, 20→3, 25→4.
- Zuweisung als Bulk-Insert in `order_assignments`; danach pro Mitarbeiter ein Aufruf von `sendEmail` und `sendSms`.
- Sammel-E-Mail-Logik zentral in `src/lib/assignmentNotification.ts`, damit auch `AssignmentDialog.tsx` (Modus „contract") dieselbe Sammelnachricht nutzt.
