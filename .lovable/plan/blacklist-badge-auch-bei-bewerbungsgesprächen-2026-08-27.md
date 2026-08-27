# Blacklist-Badge auch bei Bewerbungsgesprächen

## Ziel
Auf `/admin/bewerbungsgespraeche` soll hinter dem Namen das gleiche „Blacklist"-Badge erscheinen wie auf `/admin/bewerbungen` — wenn die E-Mail der Bewerbung auch in einem anderen Branding existiert.

## Aktueller Stand (verifiziert)
- `AdminBewerbungen.tsx` (Zeilen 271–303): Query `blacklist-emails` baut eine Map `email -> [Branding-Namen]`, indem für alle Bewerbungs-E-Mails (gechunkte `in`-Queries à 100) nach `applications` mit gleicher E-Mail aber anderem `branding_id` gesucht wird. Badge bei Zeile ~1641 mit Tooltip der Branding-Namen.
- `AdminBewerbungsgespraeche.tsx`: Die Termin-Query (Zeile ~121) lädt bereits `applications!inner(..., email, branding_id, brandings(id, company_name))`. Der Name wird in einer `TableCell` (Zeile ~724) gerendert — dort kommt das Badge hin.

## Geplante Änderung (`src/pages/admin/AdminBewerbungsgespraeche.tsx`)

1. **Blacklist-Query** analog zu AdminBewerbungen hinzufügen:
   - Sammle alle eindeutigen E-Mails (lowercase) aus den geladenen Terminen.
   - Gechunkte Abfrage (100er-Blöcke) auf `applications` mit `.in("email", chunk)` — Treffer zählen, wenn `row.branding_id !==` dem `branding_id` der eigenen Bewerbung (pro Termin merken, nicht globales aktives Branding, da die Seite ggf. mehrere Brandings zeigt).
   - Ergebnis: Map `email -> string[]` der anderen Branding-Namen.
   - `queryKey: ["blacklist-emails-gespraeche", appointments?.length]`, `enabled` wenn Termine geladen.
2. **Badge** in der Namens-`TableCell` hinter `{first_name} {last_name}`:
   - Rendern wenn `blacklistMap[email.toLowerCase()]?.length > 0`.
   - Gleiches Styling wie in AdminBewerbungen (destruktives/rotes Badge, Text „Blacklist") mit `title`-Tooltip: „Bereits vorhanden bei: …".

## Nicht im Scope
- Keine „Blacklist löschen"-Aktionsleiste (existiert nur auf /admin/bewerbungen).
- Keine Änderungen an der Datenbank oder Edge Functions.
