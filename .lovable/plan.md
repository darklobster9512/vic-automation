# Blacklist-Badge auch für den Kunden-Rang (ohne Branding-Namen)

Auf `/admin/bewerbungsgespraeche` erscheint hinter dem Namen ein rotes „Blacklist"-Badge, wenn dieselbe E-Mail-Adresse auch in einem anderen Branding vorkommt. Beim Kunden-Rang bleibt das Badge aus, weil Kunden aus Sicherheitsgründen nur Bewerbungen ihrer eigenen Brandings lesen dürfen. Künftig sollen Kunden das Badge sehen — aber ohne zu erfahren, um welche Brandings es geht.

## Umsetzung

1. **Neue, abgesicherte Datenbank-Funktion** `check_blacklist_emails(emails)`: Sie prüft intern brandingübergreifend und gibt ausschließlich die Liste der betroffenen E-Mail-Adressen zurück — keine Branding-Namen, keine IDs, keine weiteren Daten. Aufrufbar für angemeldete Nutzer.
2. **Bewerbungsgespräche-Seite**:
   - Admins: unverändert. Sie sehen weiterhin das Badge inklusive Hinweis „Bereits vorhanden bei: …".
   - Kunden (und Caller): die Prüfung läuft über die neue Funktion. Angezeigt wird nur das Badge „Blacklist" ohne Tooltip und ohne Branding-Namen.

Es werden keine Zugriffsrechte auf fremde Bewerbungen geöffnet, keine Benachrichtigungen verschickt und keine anderen Seiten verändert.

## Technische Details

- Neue Funktion `public.check_blacklist_emails(_emails text[])` als `SECURITY DEFINER`, `STABLE`, `SET search_path = public`. Sie gibt `SETOF text` zurück: alle `lower(email)` aus `public.applications`, die in mehr als einem `branding_id` vorkommen bzw. in einem Branding außerhalb der eigenen Zuordnung (`user_branding_ids(auth.uid())`). `GRANT EXECUTE` nur an `authenticated`.
- In `src/pages/admin/AdminBewerbungsgespraeche.tsx`: Rolle über `useUserRole`. Bei Admin bleibt die bestehende Abfrage mit `brandings(company_name)`; sonst `supabase.rpc("check_blacklist_emails", { _emails: chunk })` und Aufbau einer `Set<string>`-Liste. Das Badge (Zeile ~762) rendert den `title`-Tooltip nur für Admins.
