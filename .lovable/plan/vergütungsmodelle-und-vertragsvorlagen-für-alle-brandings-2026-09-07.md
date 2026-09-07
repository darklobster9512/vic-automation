# Vergütungsmodelle und Vertragsvorlagen für alle Brandings

## Ziel
Alle Brandings bekommen dasselbe Vergütungsmodell wie Codebricks und je vier Vertragsvorlagen auf Basis des gelieferten Mustervertrags – mit den jeweils eigenen Firmendaten.

## 1. Firmendaten ergänzen
Für LIMEX, PointView, Softex, Topscale, Vendis und Völler IT werden Anschrift, Geschäftsführer, Registergericht, Registernummer, USt-IdNr., Telefon, E-Mail und Domain aus deinen Angaben eingetragen. Codebricks bleibt unverändert. Efficient Flow Solutions und for.tel bleiben ohne Firmendaten, bis du sie lieferst – ihre Vorlagen zeigen dort einfach die im Branding hinterlegten Werte an (aktuell leer).

## 2. Vergütungsmodell
Bei allen neun Brandings:
- Vergütungsmodell: Festgehalt (kein Stundenlohn)
- Gehalt Minijob 603 €, Teilzeit 1206 €, Vollzeit 2987 €
- Dieselben Werte auch als „geschätztes Gehalt“ (wie bei Codebricks)

## 3. Vertragsvorlagen (4 pro Branding, 36 gesamt)
| Vorlage | Kategorie | Stunden/Woche | Monatsgehalt |
|---|---|---|---|
| Minijob 5 Std./Woche | Minijob | 5 | 603,00 € |
| Teilzeit 10 Std./Woche | Teilzeit | 10 | 1.206,00 € |
| Teilzeit 20 Std./Woche | Teilzeit | 20 | 2.412,00 € |
| Teilzeit 25 Std./Woche | Teilzeit | 25 | 2.987,00 € |

Der Vertragstext entspricht wortgetreu deinem Muster (§ 1 bis § 11); pro Vorlage werden nur Arbeitszeit, Vertragsart (Minijob bzw. Teilzeit) und Gehalt angepasst. Alle Vorlagen sind aktiv.

## 4. Automatisch gefüllte Felder
Arbeitgeberblock: Firmenname, Geschäftsführer, Straße, PLZ/Ort des jeweiligen Brandings – fest im Text hinterlegt, damit im Vertrag immer die richtigen Firmendaten stehen.
Arbeitnehmerblock und Beginn: Vorname, Nachname, Straße, PLZ, Ort und Startdatum werden beim Ausfüllen automatisch aus den Daten des Mitarbeiters eingesetzt (bestehende Platzhalterlogik).

## Technische Details
- Migration/SQL-Update auf `brandings`: `payment_model = 'fixed_salary'`, `hourly_rate_enabled = false`, `salary_*` und `estimated_salary_*` wie oben; Adress-/Register-/Kontaktfelder für die sechs genannten Brandings.
- 36 Zeilen in `contract_templates` (branding_id, title, employment_type, salary, content HTML, is_active = true).
- Im HTML-Inhalt werden die vorhandenen Platzhalter `{{vorname}}`, `{{nachname}}`, `{{strasse}}`, `{{plz}}`, `{{stadt}}`, `{{startdatum}}` verwendet; Firmendaten werden pro Branding direkt eingesetzt.
- Keine Schemaänderungen, keine E-Mails oder SMS, bestehende Verträge bleiben unberührt.
