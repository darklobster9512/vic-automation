# Mitarbeiterdaten vervollständigen: Strahler & Schönthaler

## Ist-Zustand (geprüft)
Beide Arbeitsverträge enthalten bereits fast alle Angaben:
- **Werner Strahler** (Vertrag `aaa84da9…`): Geburtsdatum 31.08.1969, Geburtsort Krumbach, Kneippstraße 26, 86381 Krumbach — alles korrekt. Es fehlt nur der zweite Vorname: `first_name` steht auf „Werner" statt „Werner Otto".
- **Merlin Joshua Schönthaler** (Vertrag `ea8287c8…`): Name, 16.03.2000, Karlsruhe, Georg-Friedrich-Str. 12, 76131 Karlsruhe — bereits vollständig und korrekt.

## Änderung
- Ein einziges Update: `first_name` bei Werner Strahler von „Werner" auf „Werner Otto".
- Bei Merlin Joshua Schönthaler ist nichts zu tun.
- Keine E-Mails/SMS, keine sonstigen Felder.

## Technisch
- `UPDATE public.employment_contracts SET first_name = 'Werner Otto' WHERE id = 'aaa84da9-84a6-4f8c-9496-396c98a844d0'`
- Danach Kontrollabfrage beider Verträge.
