# Doppelte Bewerber bei LIMEX Solutions entfernen

## Befund (geprüft in der Datenbank)

- LIMEX Solutions hat aktuell **254 Bewerbungen**, alle mit Telefonnummer.
- Nach Telefonnummer (nur Ziffern verglichen) gibt es **15 Dubletten-Gruppen** mit je 2 Einträgen.
- Zu löschen wären damit **15 Einträge** (der jeweils neuere je Gruppe).
- Alle betroffenen Einträge haben Status „neu" und **keine** Bewerbungsgespräche, Probetage oder Arbeitsverträge — es gehen also keine verknüpften Daten verloren.

Beispiele: Tobias Kabelitz, Julian Junghanns, Michaela Schmid, Marija Chichoski, Ralf B., Frank Schröter, Alexander Schlecht, Alexandra Pfister, Ingrid Braunschläger, Sandra Kloß, Stefanie Hofmann, Sandra Gerstenberg, Melanie Welsch u. a. — jeweils zweimal mit identischer Nummer erfasst.

## Vorgehen

1. Je Telefonnummer wird der **älteste** Eintrag behalten (erste Bewerbung), alle neueren Duplikate werden gelöscht.
2. Löschung erfolgt ausschließlich innerhalb des Brandings LIMEX Solutions.
3. Vor dem Löschen wird nochmals geprüft, dass kein zu löschender Eintrag zwischenzeitlich einen Termin oder Vertrag bekommen hat — solche Einträge würden stattdessen behalten.
4. Danach Gegenprüfung: 254 → 239 Bewerbungen, 0 verbleibende Dubletten.

## Technisch

- Ein Datenlösch-Statement auf `applications`, gefiltert über `branding_id` von LIMEX, Duplikat-Erkennung per `regexp_replace(phone, '[^0-9]', '', 'g')` und `row_number()` nach `created_at`.
- Keine Schema- oder Code-Änderungen.
