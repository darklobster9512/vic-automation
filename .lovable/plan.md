## Ziel
Im JSON-Response der Edge Function `test-data` soll der Feldname `mobilnummer` zu `telefonnummer` umbenannt werden.

## Änderung
Datei: `supabase/functions/test-data/index.ts`

- Zeile mit `mobilnummer: '017637235412',` → `telefonnummer: '017637235412',`
- Wert bleibt unverändert (`017637235412`), Position im Objekt bleibt gleich.

Danach wird die Function neu deployed, sodass `https://laozvnaupdecerpvwzmh.supabase.co/functions/v1/test-data` direkt das neue Feld liefert.

## Hinweis
Deine Octoparse-Automation muss das Feld dann als `telefonnummer` statt `mobilnummer` mappen.