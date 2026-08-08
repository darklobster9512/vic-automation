# 10 Platzhalteraufträge von for.tel zu LIMEX kopieren

## Ausgangslage

- for.tel Solutions GmbH hat 119 Platzhalteraufträge.
- LIMEX Solutions hat aktuell 2 Platzhalteraufträge: "Bewertung / Analyse Onlineshop Seeberger" und "Bewertung / Analyse Onlineshop Thalia".

## Was passiert

10 Platzhalteraufträge von for.tel werden nach LIMEX Solutions kopiert. Titel, die es bei LIMEX bereits gibt (Seeberger, Thalia), werden übersprungen. Ausgewählt werden die ersten 10 verbleibenden Titel in alphabetischer Reihenfolge, z. B. Adler, Alcina, Antegis, Apoolco, Atlasformen, Avocadostore, Azoo, Backwinkel, Beetronics, Berger-Shop.

Kopiert werden alle inhaltlichen Felder (Titel, Beschreibung, Vergütung, Anbieter, Projektziel, Bewertungsfragen, Arbeitsschritte, geschätzte Stunden, Store-Links, Auftragstyp). Die neuen Aufträge bekommen eigene IDs und werden dem LIMEX-Branding zugeordnet; `is_starter_job` bleibt aus.

## Technisch

Ein Datenbank-Insert (kein Schema-Wechsel):

```sql
INSERT INTO public.orders (branding_id, title, description, provider, reward, is_placeholder,
  order_type, project_goal, review_questions, work_steps, required_attachments,
  estimated_hours, appstore_url, playstore_url, is_videochat, is_starter_job)
SELECT '<limex_id>', o.title, ... FROM public.orders o
WHERE o.branding_id = '<fortel_id>' AND o.is_placeholder
  AND o.title NOT IN (SELECT title FROM public.orders WHERE branding_id = '<limex_id>')
ORDER BY o.title LIMIT 10;
```

Danach eine Kontrollabfrage, die die 10 neuen Titel bei LIMEX auflistet.
