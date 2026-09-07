# Verträge zuweisen, Vorlagen verschönern, Unterzeichner setzen

## 1. Vorlage jedem Mitarbeiter zuweisen
- Alle Arbeitsverträge mit Anstellungsart **Minijob** (166 Stück) bekommen die Minijob-Vorlage (5 Std./603 €) ihres eigenen Brandings.
- Alle mit **Teilzeit** (213 Stück) bekommen die Vorlage Teilzeit 25 Std./2.987 € ihres Brandings.
- Verträge ohne Anstellungsart (265) bleiben unverändert – dort ist nicht klar, welches Modell gilt.
- Es werden keine SMS oder E-Mails ausgelöst, nur die Zuordnung im Vertrag gesetzt.

## 2. Vertragsvorlagen schöner formatieren
Alle 36 Vorlagen (4 pro Branding) werden mit demselben, sauber gestalteten Layout neu geschrieben – Inhalt und Paragraphen bleiben identisch:
- Titelzeile "Arbeitsvertrag" zentriert, darunter dezente Trennlinie.
- Arbeitgeber und Arbeitnehmer in zwei nebeneinanderliegenden Blöcken statt untereinander.
- Paragraphenüberschriften einheitlich fett mit Abstand, Fließtext mit angenehmem Zeilenabstand.
- Aufzählungen im Tätigkeitsbereich als saubere Liste.
- Vergütung, Wochenstunden und Anstellungsart je Modell weiterhin korrekt eingetragen.
- Am Ende ein Unterschriftenbereich mit zwei Linien (Arbeitgeber / Arbeitnehmer), Ort- und Datumszeile.

## 3. Unterzeichner je Branding
Unter /admin/vertragsvorlagen wird pro Branding der Name des Unterzeichners auf den Geschäftsführer gesetzt, Titel "Geschäftsführer" bzw. "Geschäftsführerin". Die Firmenunterschrift (Bild/Schriftzug) bleibt leer.

| Branding | Unterzeichner | Titel |
|---|---|---|
| Codebricks GmbH | Erik Andreas Hübner | Geschäftsführer |
| LIMEX Solutions GmbH | Ivan Kulinstev | Geschäftsführer |
| PointView GmbH | Sven Howest | Geschäftsführer |
| Softex Unternehmensberatung & Software GmbH | Istvan Limperger | Geschäftsführer |
| Topscale GmbH | Sebastian Yrjö Küpper | Geschäftsführer |
| Vendis Development Services GmbH | Sebastian Andre Deutsch | Geschäftsführer |
| Völler IT Solutions GmbH | Klaus Völler | Geschäftsführer |

Efficient Flow Solutions GmbH und for.tel Solutions GmbH haben noch keinen hinterlegten Geschäftsführer – dort bleibt der Unterzeichner leer, bis die Daten kommen. Bei LIMEX und Vendis sind zwei Geschäftsführer hinterlegt; ich nehme jeweils den erstgenannten, das lässt sich jederzeit ändern.

## Technische Umsetzung
- Reine Datenänderungen per SQL, keine Schema- oder Code-Änderungen.
- `employment_contracts.template_id` wird per Update anhand von `branding_id` + Anstellungsart gesetzt.
- `contract_templates.content` wird pro Branding/Modell mit dem neuen HTML neu erzeugt (gleiche Platzhalter wie bisher: `{{vorname}}`, `{{nachname}}`, `{{strasse}}`, `{{plz}}`, `{{stadt}}`, `{{startdatum}}`).
- `brandings.signer_name` / `signer_title` werden gesetzt, `signature_image_url` und `signature_font` bleiben null.
