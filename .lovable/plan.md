## Ziel
Feldnamen in der Edge Function `test-data` anpassen.

## Änderung
In `supabase/functions/test-data/index.ts`:
- `strasse: 'Quellenstr.'` → `adresse: 'Quellenstr.'`
- Danach Function neu deployen und per GET-Test verifizieren.

## Offen: "ort → stadt"
Ein Feld `ort` existiert nicht. Vorhanden sind `geburtsort` und bereits `stadt`. Falls `geburtsort` → `geburtsstadt` gemeint ist, sag kurz Bescheid – dann nehme ich das mit rein.

## Ergebnis (JSON)
```json
{ "geschlecht": "Herr", "vorname": "Fabian", "nachname": "Schmidt", "geburtsdatum": "15.10.1991", "geburtsort": "Berlin", "familienstand": "ledig", "staatsangehoerigkeit": "Deutschland", "adresse": "Quellenstr.", "hausnummer": "42", "plz": "59556", "stadt": "Lippstadt", "telefonnummer": "017637235412", "email": "susannemueller@web.de", "geburtsland": "Deutschland", "passwort": "BBva551xx" }
```
