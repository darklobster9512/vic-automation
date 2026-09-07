# Kundenzugang für admin@voeller.to reparieren

## Was ich geprüft habe

- Das Konto `admin@voeller.to` hat die Rolle `kunde` und ist korrekt dem Branding „Völler IT Solutions GmbH“ zugeordnet.
- Für dieses Branding sind Daten vorhanden: 376 Bewerbungen, 165 Arbeitsverträge, 55 Aufträge.
- Die Zugriffsregeln in der Datenbank sind der Grund: Bei Bewerbungen, Arbeitsverträgen, Bewerbungsgesprächen, Vertragsvorlagen, Zeitplan-Einstellungen, Idents und den Firmendaten selbst erlauben die Leseregeln aktuell **nur** die Rolle „admin“ – die Rolle „kunde“ fehlt dort komplett. Bei Aufträgen, Zuweisungen, Bewertungen und Chat ist die Kunden-Regel dagegen vorhanden.

Beim Wiederaufbau der Datenbank sind also genau die Kunden-Leserechte auf einem Teil der Tabellen verloren gegangen.

## Was gemacht wird

Eine Datenbank-Änderung, die die fehlenden Kunden-Leserechte wieder ergänzt – jeweils streng auf die dem Kunden zugewiesenen Brandings begrenzt, nach dem gleichen Muster, das bei Aufträgen bereits funktioniert:

- Bewerbungen (lesen, Status ändern)
- Bewerbungsgespräche und Probetag-/Erster-Arbeitstag-Termine
- Arbeitsverträge (lesen, bearbeiten)
- Vertragsvorlagen
- Zeitplan-Einstellungen und gesperrte Zeitfenster
- Ident-Sitzungen
- Eigene Firmendaten (Branding lesen/bearbeiten)

Nichts wird gelöscht, bestehende Admin-Regeln bleiben unverändert, und ein Kunde sieht weiterhin ausschließlich Daten seines eigenen Brandings.

## Technische Details

- Neue `SELECT`/`UPDATE`-Policies für Rolle `authenticated` mit der Bedingung `is_kunde(auth.uid()) AND branding_id IN (SELECT user_branding_ids(auth.uid()))`.
- Für Tabellen ohne direkte `branding_id`-Spalte (z. B. `interview_appointments`, `trial_day_appointments`) wird über die bestehenden Security-Definer-Helfer (`apps_for_branding_ids`, `contracts_for_branding_ids`) gefiltert, um RLS-Rekursion zu vermeiden.
- Danach Kontrolle per Testabfrage im Kontext des Kunden-Accounts, dass Bewerbungen, Verträge und Termine des Völler-Brandings sichtbar sind und Daten anderer Brandings nicht.
