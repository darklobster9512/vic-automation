# SMS „1. Arbeitstag“ – exakt wie beim Bewerbungsgespräch

## Befund
- `sms_logs` (Event `vertrag_genehmigt`, heute 10:10–10:14 Uhr): alle SMS enthalten wörtlich `{link}`, `{name}` wurde korrekt ersetzt.
- In `short_links` gibt es aus diesem Zeitraum **keinen** neuen Eintrag – der Shortlink wurde also nie erzeugt.
- Bei den Bewerbungen (`AdminBewerbungen.tsx`) funktioniert es: dort wird `createShortLink(interviewLink, branding_id)` aufgerufen und dann `.replace(/{link}/g, shortLink)` auf den Vorlagentext angewendet.

## Umsetzung
`src/pages/admin/AdminArbeitsvertraege.tsx` (`handleApprove`) wird 1:1 auf das Bewerbungs-Muster gebracht:

1. Direkt nach dem Berechnen von `firstWorkdayLink` (vor E-Mail/SMS) wird der Shortlink erzeugt:
   `const shortLink = await createShortLink(firstWorkdayLink, brandingId)`
2. SMS-Text wie bei den Bewerbungen zusammensetzen:
   `tpl.message.replace(/{name}/g, name).replace(/{link}/g, shortLink)`
   Fallback ohne Vorlage: `Hallo <Vorname>, Ihr Arbeitsvertrag wurde genehmigt! Termin für den 1. Arbeitstag buchen: <shortLink>`
3. Kein stiller Catch mehr, der die Shortlink-Erzeugung überspringt – schlägt sie fehl, wird der volle Link eingesetzt und ein Toast/Log erzeugt, damit es sichtbar ist.
4. Die E-Mail behält den vollständigen Link im Button.

## Danach
- App neu veröffentlichen und die Admin-Seite einmal hart neu laden (Strg+Shift+R), damit nicht wieder ein alter Build läuft.
- Optional: den 5 betroffenen Personen (Esraa Yilmaz, Denis Cosic, Nele Dickmann, Isabella Haßler, Ervin Tamas) die SMS mit korrektem Link erneut senden.
