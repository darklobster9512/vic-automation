# „Meine Daten“: Gehaltskarte mit Startdatum und Vertragsbetrag

## Was sich ändert (Karte „Gehaltsauszahlungen“ auf Meine Daten)
- Statt „Anstehende Gehaltsauszahlung am …“ steht dort **„Startdatum“**, also das Startdatum aus dem Arbeitsvertrag (TT.MM.JJJJ). Gibt es keins, steht dort „-“.
- **„Betrag“** zeigt nur das Gehalt aus dem gewählten Arbeitsvertrag. Die Werte aus den Branding-Einstellungen werden dort nicht mehr verwendet (Festgehalt, Stundenlohn, geschätztes Gehalt). Ist im Vertrag kein Betrag hinterlegt, steht dort „-“.
- Alles andere auf der Seite und im Dashboard bleibt unverändert.

## Technische Details
`src/pages/mitarbeiter/MeineDaten.tsx` (Zeilen ca. 587–595): `computeNextPayout` dort durch `contractExtra?.desired_start_date` ersetzen (formatiert oder „-“). Den Betrag aus `templateSalary` holen (`> 0`, sonst „-“). Die Label-Logik für Fest- oder Stundengehalt an dieser Stelle entfällt.
