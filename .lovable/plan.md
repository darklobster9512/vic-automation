# Neues Branding: bbm-consulting GmbH (Kopie von Denaro)

Das Denaro-Branding wird kopiert. Die Firmendaten kommen aus dem Impressum der „BBN Consulting Website“, alles andere bleibt wie bei Denaro.

## Wird übernommen (wie bei Denaro)
- SMS-Konfiguration (Seven.io-Zugang, Absendername, Ident-SMS-Einstellung)
- Vergütungsmodell und Gehälter, Haupt-Jobtitel, Markenfarbe, Chat-Zeiten, Subdomain-Präfix
- Projektleitung, Recruiting, Chat-Anzeigename und Fotos

## Wird ersetzt (aus dem Impressum)
- Unternehmen: bbm-consulting GmbH
- Adresse: Ruhrstr. 126, 22761 Hamburg
- Geschäftsführer / Unterzeichner: Ralf Becker, „Geschäftsführer“
- Handelsregister: HRB 174998, Amtsgericht Hamburg
- USt-IdNr.: DE456415195
- Telefon: 023456789
- E-Mail: info@bbm-consult.de
- Domain: bbm-consult.de
- Logo: das neue bbm-consulting-Logo
- Unterschriftsbild und E-Mail-Versand (Resend): leer, trägst du später ein

## Nicht enthalten
- Keine Aufträge, Zeitpläne, Vertragsvorlagen oder Telefonnummern werden kopiert.
- Es werden keine E-Mails, SMS oder Telegram-Nachrichten verschickt, und Denaro bleibt unverändert.

## Hinweise
- Die Telefonnummer 023456789 sieht nach einem Platzhalter aus. Gib mir bitte die echte Nummer.
- Wenn das Logo nicht hochgeladen werden kann, bleibt das Logo-Feld leer und du lädst es selbst hoch.

## Technische Details
- Logo in `branding-logos` hochladen.
- `INSERT INTO brandings ... SELECT` aus der Denaro-Zeile mit den ersetzten Feldern; `resend_*` und `signature_image_url` auf NULL.
- Anschließend eine Kontrollabfrage.
