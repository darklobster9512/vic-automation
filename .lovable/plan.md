# Störungs-Info: Passwort-Reset-Mail statt Domain-Ankündigung

`/admin/brandings` → „Störungs-Info senden" wird umfunktioniert. Kein Domain-Feld mehr. Der Button öffnet direkt die Vorschau von E-Mail und SMS. Nach Bestätigung wird an alle aktiven Mitarbeiter des Brandings verschickt. Es wird **kein neues Passwort generiert** – stattdessen wird das im Vertrag hinterlegte `temp_password` mitgeschickt.

## Inhalte

E-Mail:
- Betreff: „Wichtig: Neues Passwort für dein Konto – {Firma}"
- Text: Wir hatten heute Morgen technische Probleme und mussten aus Sicherheitsgründen alle Passwörter zurücksetzen. Deine Zugangsdaten:
  - E-Mail: `<email>`
  - Passwort: `<temp_password>`
- Aufforderung: Einloggen und unter „Meine Daten" das Passwort selbst ändern.
- Button „Zum Login" → Branding-Login-URL (`https://{subdomain}.{domain}/auth`).

SMS:
- Text: „Hallo {vorname}, wir hatten heute Morgen technische Probleme. Dein neues Passwort: {passwort}. Bitte logge dich ein und ändere es unter Meine Daten. Login: {link}"
- Keine E-Mail im SMS-Text.

## Ablauf im Dialog

1. Klick auf „Störungs-Info senden" → Dialog öffnet sich, lädt sofort Empfänger (inkl. `temp_password`) und Branding-Daten.
2. Zeigt E-Mail-Vorschau (Iframe, mit Musteradresse und Muster-Passwort) und editierbaren SMS-Text.
3. Mitarbeiter ohne hinterlegtes `temp_password` werden aus der Empfängerliste ausgeschlossen (mit Hinweis-Anzahl).
4. „Jetzt an N Mitarbeiter senden" → für jeden Empfänger:
   - E-Mail versenden (mit echter E-Mail und `temp_password` im Body).
   - SMS versenden (nur Passwort + Login-Link).
   - Fortschrittsbalken wie bisher, 150 ms Delay.
5. Am Ende Toast mit Anzahl Mails/SMS/Fehler.

## Technische Details

- Datei: `src/components/admin/DomainAnnouncementDialog.tsx` umbauen (Name behalten, damit keine Import-Pfade brechen).
- Empfängerabfrage: `first_name, last_name, email, phone, temp_password`; Filter `temp_password IS NOT NULL`.
- Login-URL via existierendem `buildBrandingUrl` mit Pfad `/auth`; für SMS als Shortlink über `createShortLink`.
- E-Mail: neuer `event_type = "passwort_zurueckgesetzt_stoerung"`.
- SMS: Default-Text im Code, editierbar im Dialog, Platzhalter `{vorname}`, `{passwort}`, `{link}`.
- Keine DB-Migration, keine Edge-Function-Änderung.
