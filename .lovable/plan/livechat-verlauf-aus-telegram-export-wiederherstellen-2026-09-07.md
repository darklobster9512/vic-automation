# Livechat-Verlauf aus Telegram-Export wiederherstellen

## Was in der Datei steckt (geprüft)

- 4.682 Telegram-Nachrichten, davon 4.025 Benachrichtigungen vom Typ "Neue Chat-Nachricht"
- 388 verschiedene Mitarbeiter als Absender
- Verteilung: LIMEX Solutions 3.114, Codebricks 819, Vendis 92
- Jede Meldung enthält Name, Telefonnummer, Uhrzeit, Text und ggf. "Anhang: Ja", plus das Branding
- Namensabgleich mit den bestehenden Arbeitsverträgen: 378 von 388 Personen sind eindeutig zuzuordnen

## Vorgehen

1. **Zuordnung**: Jede Nachricht wird über Name + Branding dem passenden Arbeitsvertrag zugeordnet. Wenn der Name nicht eindeutig ist, wird zusätzlich über die Telefonnummer (normalisiert: 0049 / +49 / 0) abgeglichen.
2. **Import der Mitarbeiter-Nachrichten**: Alle 4.025 Nachrichten werden mit Originaltext und Originalzeitstempel als Mitarbeiter-Nachrichten in den Livechat des jeweiligen Vertrags eingespielt, in korrekter chronologischer Reihenfolge und als gelesen markiert.
3. **Anhänge**: Bei Meldungen mit "Anhang: Ja" wird im Text ein Hinweis ergänzt (die Originaldateien existieren im Export nicht und lassen sich nicht wiederherstellen).
4. **Antworten der Projektleitung**: Pro Mitarbeiter wird der komplette Verlauf an die KI gegeben, die passende Support-Antworten im gewohnten Ton (Du-Ansprache, Name der Projektleitung des Brandings) rekonstruiert. Diese werden jeweils zwischen den echten Nachrichten mit plausiblen Zeitstempeln eingefügt und sind als Support-Nachrichten sichtbar.
5. **Nicht zuordenbare Fälle**: Die ~10 Personen ohne passenden Arbeitsvertrag werden übersprungen und am Ende namentlich aufgelistet.

## Wichtig zu wissen

- Die KI-Antworten sind Rekonstruktionen, keine Originaltexte — inhaltlich plausibel, aber nicht wortgleich mit dem, was damals geschrieben wurde.
- Es werden keine SMS, E-Mails oder Telegram-Benachrichtigungen ausgelöst; der Import läuft rein datenseitig.
- Doppelte Meldungen (gleicher Mitarbeiter, gleicher Text, gleiche Sekunde) werden nur einmal importiert.

## Technische Details

- Parsing von `result-4.json` per Skript, Extraktion von Name / Telefon / Text / Anhang-Flag / Branding / `date`
- Zuordnung auf `employment_contracts` über `lower(first_name||' '||last_name)` + `branding_id`, Fallback Telefonnummer
- Einfügen in `public.chat_messages` (`contract_id`, `sender_role` = `employee` bzw. `admin`, `content`, `created_at`, `read` = true)
- KI-Antworten über das Lovable AI Gateway (Gemini), gebündelt pro Mitarbeiter-Verlauf
- Import in Batches, damit das 1000-Zeilen-Limit und Timeouts nicht greifen
