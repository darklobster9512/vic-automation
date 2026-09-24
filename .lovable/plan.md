# Caller-Zugriff auf Bewerbungsgespräche reparieren

## Ziel
`caller@denaro.to` soll die Bewerbungsgespräche des zugewiesenen Denaro-Brandings sehen und weiterhin nur die freigegebenen Admin-Seiten öffnen können.

## Bestätigter aktueller Stand
- Der Account hat die Rolle `caller` und nur die Seitenrechte **Bewerbungen** und **Bewerbungsgespräche**.
- In der Datenbank ist für den Account derzeit keine Branding-Zuweisung gespeichert.
- Denaro hat aktuell 27 kommende Bewerbungsgespräche.
- Die aktiven Leseregeln für Bewerbungen und Bewerbungsgespräche berücksichtigen momentan Kunden, aber keine Caller. Deshalb würde selbst eine gespeicherte Zuweisung noch keine Gespräche freigeben.

## Umsetzung
1. **Denaro-Zuweisung wiederherstellen**
   - `caller@denaro.to` eindeutig dem Branding „Denaro Consulting GmbH“ zuweisen.
   - Die Änderung idempotent ausführen, damit kein doppelter Eintrag entstehen kann.

2. **Branding-begrenzte Caller-Rechte wiederherstellen**
   - Caller dürfen Bewerbungen und Bewerbungsgespräche ausschließlich für ihre Einträge unter „Zugewiesene Brandings“ lesen.
   - Die auf der Gesprächsseite benötigten Statusänderungen und Löschaktionen ebenfalls nur innerhalb dieser Brandings erlauben.
   - Admin- und Kundenrechte unverändert lassen.

3. **Speichern der Branding-Zuweisung absichern**
   - Beim Aktivieren oder Entfernen eines Brandings eine eindeutige Erfolgs- oder Fehlermeldung anzeigen.
   - Doppelte Zuweisungen verhindern und die Anzeige nach dem Speichern sofort aktualisieren.

4. **Prüfung**
   - Datenbankseitig bestätigen, dass Denaro für den Account gespeichert ist.
   - Mit Caller-Rechten prüfen, dass die 27 kommenden Denaro-Gespräche sichtbar sind.
   - Kontrollieren, dass Gespräche anderer Brandings unsichtbar bleiben und weiterhin nur die zwei freigegebenen Reiter erscheinen.

## Technische Details
- Die Zugriffskontrolle bleibt serverseitig über Rolle plus Branding-Zuweisung abgesichert; es gibt keinen reinen Frontend-Filter.
- Es werden keine Bewerbungen oder Termine verändert und keine E-Mails, SMS oder Telegram-Nachrichten versendet.
