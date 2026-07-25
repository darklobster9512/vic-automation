## Test Edge Function für Octoparse AI

Neue Edge Function `test-data` erstellen, die auf GET-Requests mit hartkodierten JSON-Daten antwortet.

### Details

**Datei:** `supabase/functions/test-data/index.ts`

**Verhalten:**
- Akzeptiert GET-Requests (und OPTIONS für CORS)
- Antwortet mit `application/json` und den hartkodierten Testdaten
- Öffentlich zugänglich (`verify_jwt = false` in `supabase/config.toml`)
- CORS offen für alle Origins, damit Octoparse AI ohne Auth zugreifen kann

**Response-Body:**
```json
{
  "anrede": "Herr",
  "vorname": "Fabian",
  "nachname": "Schmidt",
  "geburtsdatum": "15.10.1991",
  "geburtsort": "Berlin",
  "familienstand": "ledig",
  "staatsangehoerigkeit": "Deutschland",
  "strasse": "Quellenstr. 42",
  "plz": "59556",
  "stadt": "Lippstadt",
  "mobilnummer": "+4917637235412",
  "email": "susannemueller@web.de"
}
```

**Aufruf-URL (nach Deployment):**
```
https://laozvnaupdecerpvwzmh.supabase.co/functions/v1/test-data
```

Nach dem Deploy testest du sie einfach im Browser oder in Octoparse per GET.
