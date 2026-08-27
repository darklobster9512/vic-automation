# Staatsbürgerschafts-Abfrage im Buchungsformular

## Ziel
In Schritt 2 der Buchungsseite (Name, E-Mail, Telefonnummer) kommt eine neue Pflichtabfrage zur deutschen Staatsbürgerschaft. Bei „Nein" ist ein Absenden nicht mehr möglich und ein roter Hinweistext erscheint.

## Geltungsbereich
Nur die Route `/bewerbungsgespraech/buchen`. Auf `/buchen` (gleiche Seite, andere Route) bleibt das Formular unverändert.

## Verhalten
- Neues Pflichtfeld unter der Telefonnummer: „Besitzen Sie die deutsche Staatsbürgerschaft?" mit den Optionen „Ja" und „Nein".
- Kein Wert gewählt: Absende-Button bleibt deaktiviert.
- „Ja": Formular funktioniert wie bisher.
- „Nein": Absende-Button deaktiviert, roter Hinweis direkt unter der Abfrage:
  „Für diese Position berücksichtigen wir ausschließlich Bewerberinnen und Bewerber mit deutscher Staatsbürgerschaft. Bitte bewerben Sie sich nur, wenn Sie diese Voraussetzung erfüllen."

## Technische Umsetzung
- Datei: `src/pages/BewerbungsgespraechPublic.tsx`
- Neuer State `citizenship: "ja" | "nein" | null`, gerendert als zwei Auswahl-Buttons/Radio-Gruppe im Formularbereich (`step === "form"`).
- Anzeige und Prüfung nur aktiv, wenn `location.pathname === "/bewerbungsgespraech/buchen"` (gleiche Bedingung wie beim Meta-Pixel).
- `handleSubmit` bricht zusätzlich ab, wenn die Abfrage aktiv und nicht „ja" ist; `disabled` des Submit-Buttons wird entsprechend erweitert.
- Hinweistext über bestehende Design-Tokens (`text-destructive`) statt fester Farbwerte.
- Keine Änderung an `submit-application` oder der Datenbank; die Angabe wird nicht gespeichert.
