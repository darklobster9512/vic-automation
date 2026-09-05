# Drei neue Brandings als Kopie von Codebricks

Es werden drei neue Brandings angelegt, die exakt die Einstellungen von Codebricks GmbH übernehmen (Logo, Favicon, Bilder von Projektleiter und Recruiter, Chat-Avatar, Farben, Gehälter/Stundensätze, Zahlungsmodell, Jobtitel, SMS-Konfiguration). Ersetzt werden jeweils Firmendaten, Domain, E-Mail, Ansprechpartner und Telefonnummer.

## Gemeinsame Regeln

- Telefon überall: 123456789
- Resend-Konfiguration (Absender-Name, Absender-E-Mail, API-Key): leer
- SMS-Konfiguration von Codebricks übernommen (Seven, Elitegateway, SMSBot), SMS-Absendername je Firma angepasst
- Unterschriftsbild: leer; Unterzeichner = jeweiliger Geschäftsführer, Titel „Geschäftsführer“
- Gleiche Bilder wie bei Codebricks (Logo, Favicon, Projektleiter-Foto, Recruiter-Foto, Chat-Avatar)
- Gehälter, Stundensätze, geschätzte Gehälter, Zahlungsmodell und Jobtitel identisch zu Codebricks
- USt-IdNr. bleibt leer (keine Angaben vorhanden)
- Nur der Branding-Eintrag selbst wird kopiert – keine Zeitpläne, Vertragsvorlagen oder Ident-Vorlagen

## Branding 1 – Topscale GmbH

- Adresse: Zirkusweg 1, 20359 Hamburg
- Amtsgericht Hamburg, HRB 133665
- Geschäftsführer: Sebastian Yrjö Küpper
- Domain: topscale.gmbh, E-Mail: kontakt@topscale.gmbh
- Projektleiter: Fabian Ostermann, Recruiter: Jonas Wolters
- SMS-Absender: Topscale

## Branding 2 – PointView GmbH

- Adresse: Elbchaussee 485, 22587 Hamburg
- Amtsgericht Hamburg, HRB 88760
- Geschäftsführer: Sven Howest
- Domain: pointview.gmbh, E-Mail: kontakt@pointview.gmbh
- Projektleiter: Tobias Reimers, Recruiter: Lukas Krüger
- SMS-Absender: PointView

## Branding 3 – Softex Unternehmensberatung & Software GmbH

- Adresse: Langwisch 2, 22391 Hamburg
- Amtsgericht Hamburg, HRB 163770
- Geschäftsführer: Istvan Limperger
- Domain: softex.solutions, E-Mail: kontakt@softex.solutions
- Projektleiter: Tobias Wendt, Recruiter: Andreas Lehmann
- SMS-Absender: Softex

## Technische Umsetzung

Drei `INSERT ... SELECT`-Anweisungen auf `public.brandings`, die die Zeile von Codebricks (`56aa260c-f3bc-44d3-a37b-ceb3ba01d2d9`) als Basis nehmen und die oben genannten Felder überschreiben; `resend_*` und `signature_image_url` auf NULL, `phone` auf `123456789`. Der Chat-Anzeigename wird auf „Projektleitung / Support - <Projektleiter>“ gesetzt. Danach kurze Kontrollabfrage der drei neuen Zeilen.
