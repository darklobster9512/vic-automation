# Blacklist-Badge bei /admin/bewerbungen

Hinter dem Namen erscheint ein rotes Badge "Blacklist", wenn dieselbe E-Mail-Adresse bereits in einer Bewerbung eines anderen Brandings vorkommt.

## Verhalten

- Vergleich rein über die E-Mail (klein geschrieben, DB normalisiert das ohnehin per Trigger).
- Nur Treffer in *anderen* Brandings zählen — Duplikate im selben Branding lösen kein Badge aus.
- Tooltip am Badge zeigt, in welchen Brandings die E-Mail sonst noch auftaucht.
- Bewerbungen ohne E-Mail bekommen kein Badge.

## Technische Umsetzung

In `src/pages/admin/AdminBewerbungen.tsx`:

- Neue Query `["blacklist-emails", activeBrandingId]`, abhängig von der geladenen Bewerbungsliste.
- Alle nicht-leeren E-Mails der aktuellen Liste sammeln, in Chunks von 100 abfragen:
  `applications.select("email, branding_id, brandings(company_name)").in("email", chunk).neq("branding_id", activeBrandingId)`
  (Chunking analog zur bereits eingesetzten Lösung bei den Bewertungen, um zu lange Request-URLs zu vermeiden.)
- Ergebnis zu `Map<email, string[] /* Branding-Namen */>` verdichten.
- In der Listenzeile (bei den bestehenden Badges "Indeed"/"Extern") ein `Badge variant="destructive"` mit Text "Blacklist" rendern, wenn ein Treffer existiert; Titel/Tooltip = Branding-Namen.

Keine DB-Änderungen nötig; Admins lesen brandingübergreifend, `kunde`-Accounts sehen nur Treffer in ihren eigenen Brandings.
