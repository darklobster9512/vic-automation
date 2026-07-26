## Ziel
Feld `anrede` in der Edge Function `test-data` zu `geschlecht` umbenennen.

## Änderung
Datei: `supabase/functions/test-data/index.ts`

- `anrede: 'Herr',` → `geschlecht: 'Herr',`
- Position im JSON bleibt gleich (erstes Feld).

Danach Redeploy, sodass `https://laozvnaupdecerpvwzmh.supabase.co/functions/v1/test-data` direkt `geschlecht` liefert.

## Offene Kleinigkeit
Der Wert bleibt `Herr` (groß). Falls du `herr` klein brauchst, sag kurz Bescheid.