# Exchanger-, Bankkonten-Aufträge und Vertragsvorlagen nach VONA kopieren

for.tel Solutions hat 12 Bankkonten-Aufträge (bankdrop), 8 Exchanger-Aufträge und 5 Vertragsvorlagen. VONA Cloud Solutions hat aktuell keine Aufträge und keine Vertragsvorlagen. Alle werden 1:1 kopiert.

## Was kopiert wird

**Aufträge (20)**
- 12 Bankkonten: BBVA, Comdirect, Consorsbank, 1822direkt, DKB, Deutsche Bank, Finom, ING Diba (2x), Norisbank, Revolut, Santander
- 8 Exchanger: 21btc, Bitget, Bitpanda, Bitvavo, Crypto.com, Kraken, Nexo, Web3
- Inklusive Beschreibung, Prämie, Arbeitsschritte, Bewertungsfragen, benötigte Anhänge, Videochat-Kennzeichen, App-/Playstore-Links

**Vertragsvorlagen (5)**
- Minijob 5 Std./Woche, Teilzeit 10, 10 (RV02), 20 und 25 Std./Woche
- Inklusive Vertragstext, Gehalt und Aktiv-Status

## Technisch

Ein Daten-Insert kopiert die Zeilen aus `orders` (order_type in bankdrop/exchanger) und `contract_templates` von der for.tel-Branding-ID auf die VONA-Branding-ID mit neuen IDs. Platzhalter-Aufträge und Starter-Jobs sind nicht betroffen. Doppelte Einträge werden per Titel-Prüfung vermieden.
