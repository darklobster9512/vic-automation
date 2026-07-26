## Ziel
Die Test-Edge-Function `test-data` soll Straße und Hausnummer getrennt zurückgeben.

## Änderung
Datei: `supabase/functions/test-data/index.ts`

JSON-Response wird zu:

```json
{
  "anrede": "Herr",
  "vorname": "Fabian",
  "nachname": "Schmidt",
  "geburtsdatum": "15.10.1991",
  "geburtsort": "Berlin",
  "familienstand": "ledig",
  "staatsangehoerigkeit": "Deutschland",
  "strasse": "Quellenstr.",
  "hausnummer": "42",
  "plz": "59556",
  "stadt": "Lippstadt",
  "mobilnummer": "+4917637235412",
  "email": "susannemueller@web.de"
}
```

Alles andere (GET, CORS, öffentlicher Zugriff) bleibt unverändert. Endpoint bleibt `https://laozvnaupdecerpvwzmh.supabase.co/functions/v1/test-data`.