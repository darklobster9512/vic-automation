# Blacklist-Badge auf Bewerbungsgespräche auch für Kunden (ohne Branding-Namen)

Auf `/admin/bewerbungsgespraeche` sehen Admins bereits das rote „Blacklist"-Badge hinter dem Namen, wenn die E-Mail auch in einem anderen Branding existiert. Kunden sehen es nicht, weil sie aus Sicherheitsgründen nur Bewerbungen ihrer eigenen Brandings lesen dürfen. Kunden sollen das Badge jetzt ebenfalls sehen — aber ohne Tooltip, welche Brandings betroffen sind.

## Umsetzung

1. **Neue Datenbank-Funktion (SECURITY DEFINER)**: `check_blacklist_emails(check_emails text[], own_branding_id uuid)` — gibt nur die Liste der E-Mail-Adressen zurück, die in einem anderen Branding vorkommen (keine Branding-Namen, keine weiteren Daten). Ausführbar für `authenticated`.
2. **`src/pages/admin/AdminBewerbungsgespraeche.tsx`**:
   - Über `useUserRole` die Rolle laden.
   - Admin: bisherige Abfrage mit Branding-Namen und Tooltip bleibt unverändert.
   - Kunde/Caller: statt der direkten Abfrage die neue Funktion aufrufen; Ergebnis ist eine reine E-Mail-Liste.
   - Badge-Anzeige: Admins sehen weiterhin den Tooltip „Bereits vorhanden bei: …", Kunden/Caller sehen nur das Badge „Blacklist" ohne Tooltip/Namen.

Keine Änderungen an RLS-Regeln, keine Benachrichtigungen, keine sonstigen Seiten betroffen.
