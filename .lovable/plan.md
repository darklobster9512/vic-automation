# Aufträge von LIMEX zu Codebricks kopieren + Starter-Jobs nachträglich zuweisen

## Ausgangslage
- LIMEX Solutions hat 141 Aufträge: 10 Bankdrop, 8 Exchanger, 123 Platzhalter (davon 2 als Starter-Job markiert: "Bewertung / Analyse Onlineshop Seeberger" und "... Thalia").
- Codebricks hat aktuell 0 Aufträge.
- Codebricks hat 4 Arbeitsverträge (Status "offen"), davon 2 mit Namen (Fahima Tarin, Denise Koschwitz) und 2 leere Entwürfe.

## Was gemacht wird

1. **Aufträge kopieren**
   Alle 141 LIMEX-Aufträge werden 1:1 als neue Aufträge für Codebricks angelegt (Titel, Beschreibung, Prämie, Typ, Anbieter, Aufwand, Arbeitsschritte, Bewertungsfragen, Pflicht-Anhänge, Platzhalter- und Starter-Job-Kennzeichen, Videochat-Flag). Neue IDs, Branding = Codebricks. Bestehende LIMEX-Aufträge bleiben unverändert.

2. **Starter-Jobs nachträglich zuweisen**
   Die beiden neuen Codebricks-Starter-Jobs werden allen Codebricks-Mitarbeitern zugewiesen, die sie noch nicht haben. Leere Vertragsentwürfe ohne Namen werden dabei übersprungen. Zuweisungen erhalten den Status "offen"; keine SMS/E-Mail/Telegram-Benachrichtigung wird ausgelöst.

3. **Prüfung**
   Danach wird gezählt, wie viele Aufträge bei Codebricks liegen und welche Mitarbeiter die zwei Starter-Jobs haben.

## Technische Details
- Reine Datenoperationen über SQL (`orders`, `order_assignments`), kein Code- oder Schemaänderung.
- Kopie per `INSERT INTO orders (...) SELECT ...` mit gesetztem `branding_id` von Codebricks.
- Zuweisung per `INSERT INTO order_assignments (order_id, contract_id, status)` mit `ON CONFLICT DO NOTHING` bzw. `NOT EXISTS`-Filter, damit nichts doppelt entsteht.
