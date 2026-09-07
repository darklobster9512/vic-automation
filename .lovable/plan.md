# Exchanger-Aufträge in den richtigen Tab verschieben

Die vier Krypto-Börsen-Aufträge stehen aktuell auf Typ „Andere“ und tauchen daher im falschen Tab auf. Der „Exchanger“-Tab existiert bereits im Admin-Bereich.

## Was geändert wird

- Auftragstyp der vier Exchanger-Aufträge in allen Brandings von „Andere“ auf „Exchanger“ umstellen:
  - Prozessanalyse - App & Website 21btc
  - Prozessanalyse - App & Website Börse Bitpanda
  - Prozessanalyse - App & Website Börse Coinbase
  - Prozessanalyse - App & Website Börse Nexo
- Danach erscheinen sie unter `/admin/auftraege` im Tab „Exchanger“ statt bei „Andere“.

## Technische Details

- Ein einzelnes Daten-Update auf `public.orders.order_type = 'exchanger'` für Titel, die auf 21btc, Bitpanda, Coinbase oder Nexo passen (alle Brandings).
- Das Feld ist ein freies Textfeld, der Wert „exchanger“ wird vom Tab-Filter bereits unterstützt – keine Code- oder Schemaänderung nötig.
- Keine Änderungen an Zuweisungen, Bewertungen oder anderen Auftragsfeldern.
- Anschließende Kontrolle der Typ-Verteilung.
