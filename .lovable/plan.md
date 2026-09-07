# Daten aus dem Telegram-Export für Völler IT (und for.tel) wiederherstellen

Die hochgeladene Datei enthält 4.031 Bot-Meldungen vom 10.08.2026 bis 06.09.2026: 3.409 zu Völler IT, 371 zu for.tel, 251 Bewerbungen ohne Firmenangabe.

## Was eingespielt wird

Jede Meldung wird in dem Branding angelegt, das in ihr steht (Völler IT bzw. for.tel) — genau wie bei den vorherigen Wiederherstellungen.

| Meldung | Anzahl | Ergebnis |
| --- | --- | --- |
| Neue Bewerbung eingegangen | 251 | Bewerbung – nur wenn ein Gesprächstermin dazu passt (Name/E-Mail/Telefon) |
| Kennenlern-/Bewerbungsgespräch gebucht + umgebucht | 459 | Gesprächstermine, Umbuchungen ersetzen den vorherigen Termin |
| Neuer Mitarbeiter registriert | 164 | Mitarbeiterkonto mit neu erzeugtem Passwort (im Klartext hinterlegt) |
| Arbeitsvertrag eingereicht | 97 | Arbeitsvertrag mit Anstellungsart und Wunschstart |
| Erster Arbeitstag gebucht + umgebucht | 95 | 1.-Arbeitstag-Termine, letzte Umbuchung gilt |
| Bewertung eingereicht | 1.040 | Aufträge, Auftragszuweisungen und abgegebene Bewertungen |
| Ident gestartet | 68 | Ident-Vorgänge zum jeweiligen Auftrag |
| Anhänge eingereicht | 23 | Anhänge als Platzhalter, Status „In Überprüfung“ |
| Neue Chat-Nachricht | 1.834 | Livechat-Nachrichten der Mitarbeiter mit Originalzeit |

## Regeln

- Doppelte Meldungen (gleiche Person, gleicher Inhalt) werden zusammengefasst.
- Zuordnung von Terminen, Verträgen, Bewertungen und Chats zu Personen über E-Mail, sonst Telefonnummer, sonst Name.
- Wer schon einen 1.-Arbeitstag-Termin hatte, bekommt den Arbeitsvertrag auf „genehmigt“.
- Aufträge, die es im Branding noch nicht gibt, werden aus dem Auftragstitel neu angelegt — mit denselben Inhalten (Beschreibung, Arbeitsschritte, Bewertungsfragen) wie in den anderen Brandings, 0 Stunden, 0 Prämie.
- Anhänge bleiben alle in „In Überprüfung“; Originaldateien sind nicht wiederherstellbar.
- Es werden keine SMS, E-Mails oder Telegram-Benachrichtigungen ausgelöst.
- Chat-Antworten von unserer Seite sind im Export nicht enthalten; wie zuvor werden passende deutsche Support-Antworten (Du-Ansprache) per KI ergänzt und als Rekonstruktion markiert.

## Technisch

- Parsing des Exports in einem Python-Skript außerhalb des Projekts, Ausgabe als strukturierte Batches.
- Import über eine temporäre Edge Function mit Service-Role (wie beim letzten Chat-Import), die nach Abschluss wieder gelöscht wird.
- Abschließende Prüfung per Datenbankabfrage: Anzahl Bewerbungen, Termine, Verträge, Bewertungen, Idents, Anhänge und Chat-Nachrichten je Branding.
