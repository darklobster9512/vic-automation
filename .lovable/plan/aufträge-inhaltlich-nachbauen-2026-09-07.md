# Aufträge inhaltlich nachbauen

Alle 279 Aufträge (134 unterschiedliche Titel) in allen Brandings haben aktuell nur einen Titel – Beschreibung, Projektziel, Arbeitsschritte, Bewertungsfragen und Anhänge sind leer. Diese Inhalte werden passend zum jeweiligen Titel neu erzeugt.

## Was gemacht wird

1. **Inhalte pro Titel erzeugen (KI, einmal je eindeutigem Titel, dann auf alle Brandings übertragen)**
   - Beschreibung: kurzer Einleitungstext, worum es im Auftrag geht
   - Projektziel: 2–4 Sätze
   - Arbeitsschritte: 4–7 Schritte mit Titel und Erklärung
   - Bewertungsfragen: 5 Fragen, passend zum Auftragstyp
   - Benötigte Nachweise: passend zum Auftrag (z. B. Screenshots), bei Bankdrop-/Identaufträgen entsprechend
   - Der Ton entspricht den bestehenden Aufträgen: Sie-Ansprache, sachlich, Prozess-/Testeranalyse.

2. **Auftragstyp-Logik**
   - Onlineshop-/App-Analysen: Test- und Bewertungsschritte des Bestell-/Nutzungsprozesses
   - Bank-/Identprozesse (z. B. Deutsche Bank, DKB, BBVA): Schritte zum Ident- und Verifizierungsprozess
   - Videochat-/Sonderaufträge behalten ihren Typ

3. **Vergütung und Aufwand**
   - Überall Prämie 0 und geschätzte Stunden 0

4. **Starter-Jobs**
   - Bei allen Thalia- und Seeberger-Aufträgen (in jedem Branding) wird „Starter Job“ aktiviert, bei allen anderen bleibt es aus.

5. **Kontrolle**
   - Nach dem Einspielen wird geprüft: Anzahl Aufträge mit Beschreibung, Schritten und Fragen je Branding sowie die Starter-Job-Markierungen.

## Technische Details

- Inhalte werden über das Lovable AI Gateway generiert (Batchlauf im Sandbox-Skript, gruppiert nach eindeutigem Titel).
- Zielspalten in `orders`: `description`, `project_goal`, `work_steps` (`[{title, description}]`), `review_questions` (`string[]`), `required_attachments` (`[{title, description}]`), `reward`, `estimated_hours`, `is_starter_job`.
- Update erfolgt per Titel-Match über alle Brandings, damit gleiche Aufträge identische Inhalte bekommen.
- Es werden keine Zuweisungen, Bewertungen oder bestehenden Mitarbeiterdaten verändert und keine Benachrichtigungen ausgelöst.
