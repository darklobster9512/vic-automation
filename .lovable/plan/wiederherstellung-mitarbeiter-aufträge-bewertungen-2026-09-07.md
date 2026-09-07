# Wiederherstellung: Mitarbeiter, Aufträge, Bewertungen

Grundlage ist der zweite Telegram-Export (`result-2.json`, 5.239 Nachrichten, 05.08.–06.09.2026) mit:

- 644 „Neuer Mitarbeiter registriert“ (Name, E-Mail, Telefon, Branding)
- 382 „Arbeitsvertrag eingereicht“ (Name, E-Mail, Telefon, Art, Wunschstart, Branding)
- 4.202 „Bewertung eingereicht“ (Mitarbeiter, Telefon, Auftragstitel, Ø-Bewertung, Anzahl Fragen, ein Kommentarzitat, Branding)

Verteilung: LIMEX, Codebricks, Vendis. 633 eindeutige Mitarbeiter-E-Mails, 279 eindeutige Aufträge, 4.163 Mitarbeiter-Auftrag-Kombinationen mit Bewertung.

## Was gemacht wird

1. **Mitarbeiter wiederherstellen**
   - Aus Registrierungs- und Vertragsmeldungen ein Datensatz pro E-Mail (Duplikate zusammengeführt, Vertragsdaten haben Vorrang).
   - Für jeden Mitarbeiter ein Vertrag im richtigen Branding mit Name, E-Mail, Telefon, Beschäftigungsart und Wunschstart.
   - Verknüpfung mit den bereits wiederhergestellten Bewerbungen über die E-Mail (sonst neu angelegt).
   - Status: „eingereicht“ bei vorhandener Vertragsmeldung, sonst „offen“.

2. **Zugänge neu anlegen**
   - Für jeden Mitarbeiter ein Login-Konto mit neu generiertem Passwort.
   - Passwort im Klartext im Vertrag hinterlegt, damit es im Panel sichtbar ist (wie bisher üblich).

3. **Aufträge nachbauen**
   - Pro Branding je ein Auftrag je eindeutigem Auftragstitel aus den Bewertungen (134 LIMEX, 123 Codebricks, 22 Vendis).
   - Auftragstyp wird aus dem Titel abgeleitet (Ident-/Bankprozess vs. Onlineshop-Bewertung).

4. **Zuweisungen und Bewertungen**
   - Für jede Mitarbeiter-Auftrag-Kombination eine Zuweisung mit Status „erfolgreich“ (Bewertung liegt vor), Datum aus der Telegram-Nachricht.
   - Je Kombination eine Bewertung mit der übermittelten Durchschnittsnote und dem im Export enthaltenen Kommentar.

5. **Kontrolle**
   - Abschließende Zählung je Branding: Mitarbeiter, Aufträge, Zuweisungen, Bewertungen; Stichproben-Vergleich mit dem Export.

## Grenzen / Annahmen

- Der Export enthält je Bewertung nur **einen** Kommentar und die **Durchschnittsnote**, nicht die einzelnen Fragen und Einzelnoten. Es wird daher pro Bewertung ein zusammengefasster Eintrag angelegt.
- Vergütung, Beschreibung, Arbeitsschritte und Pflichtanhänge der Aufträge sind im Export nicht enthalten und bleiben leer bzw. auf Standardwerten; diese müssen im Panel nachgepflegt werden.
- Kontostände, Auszahlungen, Anhänge und Chatverläufe lassen sich aus diesem Export nicht rekonstruieren.

## Technisch

- Parsing lokal in Python (`/tmp/restore/`), Ausgabe als JSON-Batches.
- Einspielen über eine temporäre, per `DB_REPLAY_KEY` geschützte Edge Function (Service-Role) in Batches; Kontoerstellung über die Admin-API mit generiertem Passwort; Rolle `user` je Konto.
- Die temporäre Import-Function wird nach Abschluss wieder entfernt.
