# Statistiken: „Akzeptiert" und „Termin gebucht" zeigen 0

## Ursache (geprüft)

Die Seite zählt „akzeptiert" und „Termin gebucht" derzeit als Kohorte über das **Eingangsdatum der Bewerbung**. Für LIMEX Solutions gilt in den letzten 7 Tagen:

- 199 Bewerbungsgespräche wurden in diesem Zeitraum gebucht
- davon stammen **0** aus Bewerbungen, die in diesem Zeitraum eingegangen sind (alle akzeptierten Bewerbungen sind älter)
- alle Bewerbungen der letzten 3 Tage stehen noch auf Status `neu`

Ergebnis: Bewerbungen zeigt hunderte Einträge, Akzeptiert und Termin gebucht bleiben bei 0 — obwohl täglich akzeptiert und gebucht wird.

## Lösung: Auswertung nach Ereignisdatum statt Eingangsdatum

1. **Termin gebucht** wird künftig über `interview_appointments.created_at` im gewählten Zeitraum gezählt (Buchungsdatum), nicht mehr über das Bewerbungsdatum.
2. **Akzeptiert** braucht einen eigenen Zeitstempel. Neue Spalte `accepted_at` in `applications`:
   - wird beim Akzeptieren gesetzt (Einzel- und Massen-Akzeptieren in `/admin/bewerbungen`, Auto-Accept in der `submit-application` Edge Function, Caller-API sofern dort akzeptiert wird)
   - Backfill für bestehende Bewerbungen mit Status ungleich `neu`/`abgelehnt`: frühester `created_at` des zugehörigen Interview-Termins, ersatzweise `applications.created_at`
   - Statistik zählt „Akzeptiert" über `accepted_at` im Zeitraum
3. **Bewerbungen** bleibt wie bisher das Eingangsdatum (`created_at`).
4. Quoten werden entsprechend angepasst: Termin gebucht in % der Akzeptierten im gleichen Zeitraum; im Funnel wird darauf hingewiesen, dass es sich um Ereigniszahlen pro Zeitraum handelt (nicht um dieselbe Personengruppe).
5. Tabelle und Balkendiagramm „Bewerbungen pro Tag" bekommen die Spalten Eingegangen / Akzeptiert (Akzeptierdatum) / Termin gebucht (Buchungsdatum).

## Technische Details

- Migration: `ALTER TABLE public.applications ADD COLUMN accepted_at timestamptz;` plus Backfill-Update; keine neuen Policies nötig (Spalte auf bestehender Tabelle).
- `src/pages/admin/AdminStatistiken.tsx`: `appsQ` bleibt; `bookedQ` wird zu einer Abfrage auf `interview_appointments` mit `created_at`-Filter und Join auf `applications.branding_id`; neue Abfrage für akzeptierte Bewerbungen über `accepted_at`. Aggregation pro Tag entsprechend umgestellt.
- `src/pages/admin/AdminBewerbungen.tsx`: beim Statuswechsel auf akzeptiert zusätzlich `accepted_at: new Date().toISOString()` setzen (auch im Bulk-Queue-Pfad).
- `supabase/functions/submit-application/index.ts`: bei Auto-Accept `accepted_at` mitschreiben.
- Keine Änderung an Terminlogik, Slots, Benachrichtigungen oder Routen.
