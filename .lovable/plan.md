# Störungs-Info: Passwort-Reset statt Domain-Ankündigung

`/admin/brandings` → „Störungs-Info senden" wird umfunktioniert. Kein Domain-Feld mehr. Der Button öffnet direkt die Vorschau von E-Mail und SMS. Nach Bestätigung wird für jeden aktiven Mitarbeiter des Brandings ein neues Passwort generiert, gesetzt und via E-Mail + SMS verschickt.

## Inhalte

E-Mail:
- Betreff: „Wichtig: Neues Passwort für dein Konto – {Firma}"
- Text: Wir hatten heute Morgen technische Probleme und mussten aus Sicherheitsgründen alle Passwörter zurücksetzen. Deine Zugangsdaten:
  - E-Mail: `<email>`
  - Neues Passwort: `<neues_passwort>`
- Aufforderung: Einloggen und unter „Meine Daten" das Passwort selbst ändern.
- Button „Zum Login" → Branding-Login-URL (`https://{subdomain}.{domain}/auth`).

SMS:
- Text: „Hallo {vorname}, wir hatten heute Morgen technische Probleme. Dein neues Passwort: {passwort}. Bitte logge dich ein und ändere es unter Meine Daten. Login: {link}"
- Keine E-Mail im SMS-Text.

## Ablauf im Dialog

1. Klick auf „Störungs-Info senden" → Dialog öffnet sich, lädt sofort Empfänger und Branding-Daten.
2. Zeigt E-Mail-Vorschau (Iframe, mit Platzhalter-Passwort `********` und Musteradresse) und editierbaren SMS-Text.
3. „Jetzt an N Mitarbeiter senden" → für jeden Empfänger:
   - Neues 12-stelliges Passwort generieren (alphanumerisch, keine mehrdeutigen Zeichen).
   - `reset-employee-password` Edge Function aufrufen mit `contract_id` + `new_password`.
   - E-Mail versenden (mit echter E-Mail und Passwort im Body).
   - SMS versenden (nur Passwort + Login-Link).
   - Fortschrittsbalken wie bisher, 150 ms Delay.
4. Am Ende Toast mit Anzahl Mails/SMS/Fehler.

## Technische Details

- Datei: `src/components/admin/DomainAnnouncementDialog.tsx` komplett umbauen (Name behalten, damit keine Import-Pfade brechen).
- Empfängerabfrage erweitern um `id` (contract_id), damit Passwort-Reset möglich ist.
- Login-URL via existierendem `buildBrandingUrl` bzw. dem Muster wie in `AdminArbeitsvertraege.tsx`, Pfad `/auth`. Für SMS als Shortlink über `createShortLink`.
- E-Mail: neuer `event_type = "passwort_zurueckgesetzt_stoerung"`. `body_lines` enthält E-Mail und Passwort; `metadata` speichert nichts Sensibles außer `contract_id`.
- SMS: gleicher `event_type`. Template kommt nicht aus `sms_templates`; Default-Text im Code, editierbar im Dialog.
- Neue Passwörter werden durch `reset-employee-password` bereits als `temp_password` gespeichert – keine zusätzliche DB-Änderung nötig.
- Keine DB-Migration.
