# Prüfung: Mitarbeiter-Rechte bei Idents

## Ergebnis der Prüfung

Geprüft wurden die Zugriffsregeln in der Datenbank und die Ident-Ansicht im Mitarbeiterbereich.

**Funktioniert bereits korrekt:**
- Mitarbeiter sehen ihre eigene Ident-Sitzung (inkl. zugewiesener Nummer und Info-Text) und dürfen sie aktualisieren.
- Mitarbeiter sehen nur die ihnen zugewiesenen Aufträge, ihre eigenen Zuweisungen, Termine und hochgeladenen Anhänge.
- Die Live-Aktualisierung der Ident-Sitzung und der Abruf eingehender SMS über die beiden Nummern-Anbieter sind für eingeloggte Mitarbeiter erlaubt.

**Zwei Probleme gefunden:**

### 1. Eingehende SMS können verschwinden
Die Anzeige blendet alle SMS aus, die vor dem "zuletzt geändert"-Zeitpunkt der Ident-Sitzung eingegangen sind. Dieser Zeitpunkt verschiebt sich jedoch bei jeder Änderung (Statuswechsel, Info-Text bearbeiten, Daten nachtragen). Folge: Sobald ein Admin etwas an der Sitzung ändert, sind zuvor eingegangene SMS für den Mitarbeiter plötzlich nicht mehr sichtbar.

Fix: Als Grenze einen festen Zeitpunkt verwenden — den Zeitpunkt, ab dem die Nummer zugewiesen wurde — statt des sich ständig ändernden Änderungszeitpunkts. Bereits sichtbare SMS bleiben damit dauerhaft sichtbar.

### 2. Vertragsdaten sind für nicht eingeloggte Besucher offen
Die Arbeitsvertrags-Tabelle erlaubt aktuell jedem nicht eingeloggten Besucher das Lesen und Ändern aller Datensätze (inkl. IBAN, Steuer-ID, Ausweislinks, gespeicherter Passwörter). Das stammt aus dem Wiederaufbau der Datenbank und ist deutlich weiter als nötig — die öffentlichen Seiten (Vertrag ausfüllen, 1. Arbeitstag buchen) brauchen nur den jeweils eigenen Datensatz.

Fix: Öffentlichen Zugriff auf die benötigten Fälle einschränken bzw. über die vorhandenen abgesicherten Funktionen abwickeln, eingeloggte Mitarbeiter lesen/ändern weiterhin nur ihren eigenen Vertrag.

## Technische Umsetzung
- `src/pages/mitarbeiter/AuftragDetails.tsx`: SMS-Filter von `identSession.updated_at` auf einen stabilen Startzeitpunkt umstellen (Zeitpunkt des Setzens von `phone_api_url`, hilfsweise `created_at` der Sitzung bzw. `assigned_at` der Zuweisung).
- Migration: Policies `Anon can select/update employment_contracts` (USING `true`) ersetzen durch eng gefasste Regeln; öffentliche Schreibpfade laufen über die bestehenden `SECURITY DEFINER`-RPCs (`submit_employment_contract`, `update_contract_phone_public`, `book_first_workday_public`).
- Danach öffentliche Vertrags- und Buchungsseiten sowie die Mitarbeiter-Ident-Ansicht gegenprüfen.

## Offene Frage
Punkt 2 berührt die öffentlichen Seiten. Soll ich beides umsetzen oder zunächst nur den SMS-Fix (Punkt 1)?
