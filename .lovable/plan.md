# Erste Arbeitstage und eingereichte Anhänge wiederherstellen

Aus dem neuen Telegram-Export (`result-3.json`, 521 Nachrichten) lassen sich zwei weitere Datensätze zurückholen.

## Was im Export steckt

- 324 Meldungen "Erster Arbeitstag gebucht" bzw. "1. Arbeitstag umgebucht" (Name, Telefon, E-Mail, Datum, Uhrzeit, Branding) — 300 verschiedene E-Mail-Adressen
  - LIMEX 231, Codebricks 77, Vendis 16
- 130 Meldungen "Anhänge eingereicht" (Mitarbeiter, Telefon, Auftrag, Branding) über 11 verschiedene Aufträge
  - LIMEX 96, Codebricks 32, Vendis 2

Stichprobe bestätigt: die E-Mails der Terminmeldungen existieren bereits als wiederhergestellte Mitarbeiter-Verträge.

## Vorgehen

1. **Termine erster Arbeitstag**
   - Pro Person nur die jeweils letzte Meldung verwenden (Umbuchungen überschreiben ältere Termine).
   - Zuordnung zum Mitarbeiter über E-Mail, ersatzweise Telefonnummer, innerhalb des im Export genannten Brandings.
   - Termin mit Datum, Uhrzeit und Status "offen" anlegen, verknüpft mit Vertrag und – falls vorhanden – der zugehörigen Bewerbung.
   - Bereits vergangene Termine werden trotzdem angelegt, damit die Historie stimmt.

2. **Eingereichte Anhänge**
   - Mitarbeiter über Name + Telefonnummer im jeweiligen Branding zuordnen, Auftrag über den Auftragstitel im selben Branding.
   - Pro Meldung ein Anhang-Eintrag mit Status **In Überprüfung** (nichts wird genehmigt).
   - Fehlt zu einer Meldung noch die Auftragszuweisung, wird sie ergänzt und auf "in Überprüfung" gesetzt, damit der Anhang im Panel sichtbar ist.

3. **Kontrolle**
   - Zählung je Branding: angelegte Termine, angelegte Anhänge, nicht zuordenbare Meldungen werden aufgelistet.

## Wichtig zu wissen

- Die hochgeladenen Bild-/PDF-Dateien selbst sind nicht wiederherstellbar – sie lagen im gelöschten Speicher. Die Einträge bekommen einen Platzhalter-Verweis, damit im Panel ersichtlich ist, wer wann was eingereicht hat; die Dateivorschau bleibt leer.
- Der Export nennt nicht, wie viele einzelne Dateien pro Einreichung hochgeladen wurden, deshalb entsteht genau ein Eintrag pro Meldung.
- Meldungen ohne passenden Mitarbeiter oder Auftrag werden übersprungen und im Ergebnis aufgeführt.

## Technische Umsetzung

- Parsing lokal in `/tmp/restore3/` (Python), Zuordnung von `employment_contracts`, `applications`, `orders` per Query.
- Import über SQL-Inserts in `first_workday_appointments`, `order_attachments` (`status = 'in_pruefung'`, Platzhalter-`file_url`) und fehlende `order_assignments` (`status = 'in_pruefung'`).
- Keine Schema-Änderungen nötig; keine Änderung an bestehenden Bewertungen oder Konten.
