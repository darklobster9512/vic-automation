# Umbuchungs-Link in der Terminbestätigung

## Ziel
Die Bestätigungs-E-Mail zum Kennenlerngespräch enthält zusätzlich einen anklickbaren Link, über den der Bewerber seinen Termin selbst umbuchen kann.

## Umsetzung
- In der Buchungsseite (`src/pages/Bewerbungsgespraech.tsx`, Bestätigungs-E-Mail nach erfolgreicher Buchung/Umbuchung) vor dem E-Mail-Versand einen Shortlink erzeugen:
  - Ziel-URL über `buildBrandingUrl(branding_id, "/bewerbungsgespraech/<application_id>")` (gleiche Logik wie beim Mailbox-SMS-Link).
  - Kürzen über `createShortLink(url, branding_id)` → `/r/<code>`.
- Zusätzliche Zeile im E-Mail-Text, z. B.:
  "Sie können Ihren Termin hier jederzeit umbuchen: <shortlink>"
- Der bestehende Linkify-Mechanismus in `src/lib/buildEmailHtml.ts` macht die URL automatisch anklickbar.
- Fällt die Link-Erzeugung aus (Fehler/kein Branding), wird die Zeile weggelassen; die E-Mail geht trotzdem raus.

## Hinweise
- Betrifft sowohl Erstbuchung als auch Umbuchung (gleicher Versandpfad).
- SMS-Templates und Mailbox-Flow bleiben unverändert.
