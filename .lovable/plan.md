# Nachweise nur bei Bankdrop- und Exchanger-Aufträgen

Aktuell haben fast alle Aufträge (auch alle Onlineshop-Aufträge) 3 erforderliche Nachweise. Das soll nur noch für Bank- und Krypto-Aufträge gelten.

## Was geändert wird

1. **Bankdrop-Aufträge behalten Nachweise**
   Alle 8 Identprozess-Aufträge (Deutsche Bank, DKB, Postbank, ING Diba, Santander, Consorsbank, BBVA, 1822direkt) behalten ihre erforderlichen Nachweise. Vereinheitlicht auf denselben Satz Nachweise pro Bankauftrag.

2. **Exchanger-Aufträge behalten Nachweise**
   Identifiziert als Krypto-Börsen-Aufträge:
   - Prozessanalyse - App & Website 21btc
   - Prozessanalyse - App & Website Börse Bitpanda
   - Prozessanalyse - App & Website Börse Coinbase
   - Prozessanalyse - App & Website Börse Nexo

   Diese bekommen passende Nachweise (z. B. Screenshot Kontoeröffnung/Verifizierung, Screenshot Übersicht, Abschluss-Screenshot).

3. **Alle übrigen Aufträge: keine Nachweise**
   Bei allen Onlineshop- und sonstigen Aufträgen wird die Liste der erforderlichen Nachweise geleert. Beschreibung, Projektziel, Arbeitsschritte und Bewertungsfragen bleiben unverändert.

Die Änderung gilt in allen Brandings gleichzeitig, über den Auftragstitel abgeglichen.

## Technische Details

- Update auf `public.orders.required_attachments` per SQL:
  - Titel mit `Identprozess` -> Bank-Nachweise
  - Titel in der Exchanger-Liste (21btc, Bitpanda, Coinbase, Nexo) -> Exchanger-Nachweise
  - alle anderen -> `'[]'::jsonb`
- Keine Änderungen an Zuweisungen, Bewertungen, bereits hochgeladenen `order_attachments` oder Mitarbeiterdaten.
- Anschließende Kontrolle: Anzahl Aufträge mit Nachweisen je Branding und Auftragstyp.
