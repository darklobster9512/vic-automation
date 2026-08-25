# Anhänge-Seite zeigt nichts an – Ursache und Fix

## Was passiert

Auf `/admin/anhaenge` schlägt die Datenabfrage fehl. Bestätigt in den Netzwerk-Logs:

- Die Seite lädt zuerst alle Arbeitsverträge des aktiven Brandings (LIMEX: 652 Stück).
- Danach fragt sie die Anhänge mit einer Liste **aller 652 Vertrags-IDs in der URL** ab.
- Diese URL ist zu lang → Supabase antwortet mit `400 Bad Request`, die Liste bleibt leer.

In der Datenbank sind die Anhänge vorhanden (LIMEX: 113 eingereicht, 18 genehmigt, 37 Entwurf).

Es ist derselbe Fehlertyp, der zuvor bei `/admin/bewertungen` behoben wurde.

## Fix

`src/pages/admin/AdminAnhaenge.tsx`:

1. Vertrags-IDs in Blöcke à ca. 100 IDs aufteilen und die Anhänge-Abfrage pro Block ausführen (`Promise.all`), Ergebnisse zusammenführen — analog zur bereits bestehenden Chunk-Logik in `AdminBewertungen.tsx`.
2. Fehler der Abfrage sichtbar machen (Fehlermeldung statt „Keine Anhänge vorhanden“), damit ein solcher Ausfall künftig nicht als leerer Zustand erscheint.
3. Falls weitere Stellen dieselbe Vertrags-ID-Liste an eine Abfrage übergeben (z. B. Badge-/Zähler-Query mit `status=eingereicht`), dort dieselbe Chunk-Logik anwenden.

Keine Änderungen an Datenbank, RLS oder Anhänge-Logik nötig.
