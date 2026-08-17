# Postbank-Bankauftrag für LIMEX Solutions

Ein neuer Bank-Auftrag für die Postbank wird bei LIMEX Solutions angelegt — inhaltlich und strukturell identisch zum bestehenden DKB-Auftrag.

## Vorgehen

Der vorhandene DKB-Auftrag ("Bewertung / Analyse & Evaluierungsprozess – Identprozess der DKB AG") wird als Vorlage kopiert. Dabei werden übernommen:

- Auftragstyp `bankdrop`, Videochat-Kennzeichnung, geschätzte Stunden, Prämie
- Beschreibung, alle Arbeitsschritte, Bewertungsfragen und geforderte Nachweise

Angepasst werden ausschließlich die Bankbezüge:

- "DKB AG" / "DKB" wird zu "Postbank"
- Website-Link `https://dkb.de` wird zu `https://postbank.de`
- Titel: "Bewertung / Analyse & Evaluierungsprozess – Identprozess der Postbank"

## Technisch

Ein einzelnes SQL-Insert in `orders`, das die DKB-Zeile des LIMEX-Brandings (`371a2e6c-8a38-4c27-b4a4-34cf38694b1b`) mit Textersetzung dupliziert. Kein Code-Change im Frontend nötig — der Auftrag erscheint automatisch unter /admin/auftraege im Bankdrop-Tab.
