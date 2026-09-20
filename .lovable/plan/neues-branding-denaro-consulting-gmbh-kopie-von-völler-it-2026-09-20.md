# Neues Branding: Denaro Consulting GmbH (Kopie von Völler IT)

Ein neues Branding wird als Kopie von „Völler IT Solutions GmbH" angelegt. SMS-Konfiguration, Vergütungsmodell inkl. Festgehalt-Beträge und der Haupt-Jobtitel bleiben identisch; alle Firmen- und Personendaten kommen aus dem Referenzprojekt „Denaro Consulting Landing".

## Wird übernommen (unverändert von Völler)

- SMS-Konfiguration (Seven.io-Zugang, Ident-SMS-Einstellung) — Absendername wird auf „Denaro" geändert
- Vergütungsmodell „Festgehalt": Minijob 603 €, Teilzeit 1.206 €, Vollzeit 2.987 €
- Geschätzte Gehälter: 603 / 1.206 / 2.987 €, Stundenlohn-Option bleibt aus
- Haupt-Jobtitel: „Online-Prozesstester:in für digitale Anwendungen (m/w/d)"
- Markenfarbe, Chat-Zeiten, Subdomain-Präfix „portal"

## Wird ersetzt (Daten aus dem Referenzprojekt)

- Unternehmen: Denaro Consulting GmbH
- Adresse: Mettlacher Straße 10, 40468 Düsseldorf
- Geschäftsführer / Unterzeichner: Alexander Valentino Denaro, „Geschäftsführer"
- Handelsregister: HRB 107712, Amtsgericht Düsseldorf
- USt-IdNr.: DE163919849
- Telefon: 0211 87971210
- E-Mail: kontakt@denaro-consult.com
- Domain: denaro-consult.solutions
- Projektleitung: Michael Bergmann, Recruiting: Jonas Reuter
- Chat-Anzeigename: „Projektleiter - Michael Bergmann"
- Bilder: Denaro-Logo, Foto Projektleitung, Foto Recruiting aus dem Referenzprojekt
- Unterschriftsbild: leer (Völler-Unterschrift wird nicht übernommen)
- E-Mail-Versand (Resend): leer, trägst du später ein

## Technische Umsetzung

1. Logo, Projektleiter- und Recruiter-Foto aus dem Referenz-Snapshot in den Storage-Bucket `branding-logos` hochladen; Favicon bleibt zunächst leer.
2. `INSERT INTO public.brandings ... SELECT` mit der Völler-Zeile (`c8b2972b-64c6-467a-b8b7-00984727bbd6`) als Basis, überschrieben mit den oben genannten Feldern; `resend_*` und `signature_image_url` auf NULL, `sms_sender_name` = „Denaro".
3. Nur der Branding-Datensatz wird angelegt — keine Zeitpläne, Aufträge, Vertragsvorlagen, Telefonnummern oder SMS-Spoof-Vorlagen.
4. Keine E-Mails, SMS oder Telegram-Nachrichten; keine Änderung am Völler-Branding.
5. Abschließende Kontrollabfrage der neuen Zeile.
