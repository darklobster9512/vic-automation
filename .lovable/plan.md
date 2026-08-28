# Vergütungsmodell auf Festgehalt umstellen

## Ausgangslage (geprüft)

| Branding | Modell | Stundenlohn aktiv | Std.-Sätze (Mini/Teil/Voll) | Voraussichtl. Gehalt |
|---|---|---|---|---|
| Codebricks GmbH | per_order | nein | – | – |
| Vendis Development Services GmbH | fixed_salary | ja | 29 / 29 / 29 | 603 / 2.500 / 3.000 |
| LIMEX Solutions GmbH | fixed_salary | ja | 29 / 29 / 29 | 603 / 2.500 / 3.000 |

Vendis ist bereits auf Festgehalt konfiguriert. Nur Codebricks steht noch auf „pro Auftrag" — deshalb zeigt die Auszahlungs-Karte bei Adam Darman den Kontostand (0,00 €) statt eines Gehalts.

## Änderung

Codebricks GmbH bekommt exakt dieselbe Vergütungskonfiguration wie Vendis/LIMEX:

- Zahlungsmodell: `fixed_salary`
- Stundenlohn aktiviert: ja
- Stundensätze: Minijob 29 €, Teilzeit 29 €, Vollzeit 29 €
- Voraussichtliches Monatsgehalt: Minijob 603 €, Teilzeit 2.500 €, Vollzeit 3.000 €
- Festgehälter: Minijob 520 €, Teilzeit 1.500 €, Vollzeit 3.000 €

Vendis bleibt unverändert (Werte stimmen bereits überein).

## Wirkung

Im Mitarbeiter-Panel zeigt die Karte „Gehaltsauszahlung" dann das voraussichtliche Monatsgehalt. Da bei Verträgen mit hinterlegter Vertragsvorlage deren Gehalt Vorrang hat, sieht Adam Darman den Betrag seiner 25-Std.-Vorlage (2.976 €) statt 0 €.

## Technisch

Reines Daten-Update auf der Tabelle `brandings` (Zeile Codebricks). Keine Code- oder Schemaänderung.
