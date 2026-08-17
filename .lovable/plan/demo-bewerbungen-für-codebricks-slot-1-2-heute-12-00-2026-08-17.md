# Demo-Bewerbungen für Codebricks (Slot 1 & 2, heute 12:00)

## Ziel
Zwei Testdatensätze bei Codebricks GmbH, damit das Team alle Funktionen auf der Bewerbungsgespräche-Seite durchspielen kann.

## Was angelegt wird

Zwei Bewerbungen (Tabelle `applications`, Branding Codebricks GmbH, Status "termin_gebucht"):

| Name | E-Mail | Telefon | Anstellung |
|---|---|---|---|
| Demo Eins | demo.eins@example.com | 01700000001 | minijob |
| Demo Zwei | demo.zwei@example.com | 01700000002 | teilzeit |

Adresse jeweils: Demostraße 1, 12345 Demostadt.

Dazu je ein Gesprächstermin (`interview_appointments`) heute (17.08.2026) um 12:00 Uhr:
- Demo Eins → Slot 1
- Demo Zwei → Slot 2

Status jeweils "geplant", damit Erfolgreich / Mailbox / Fehlgeschlagen, Erinnerungen, Panel-Link usw. getestet werden können.

## Hinweise
- Beide Slots sind um 12:00 aktuell frei, es entstehen keine Kollisionen.
- Es werden keine E-Mails oder SMS ausgelöst (reiner Datenbank-Eintrag); Testversand geht nur an die Demo-Adressen/Nummern, die keine echten Empfänger sind.
- Keine Code-Änderungen nötig.
