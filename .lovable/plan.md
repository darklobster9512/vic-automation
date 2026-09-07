# Beschreibung „1. Grundinformationen" bei allen Bank-Aufträgen aktualisieren

## Ziel
Die Beschreibung aller Bank-Aufträge (Bankdrop) in allen Brandings erhält einen neuen, einheitlichen Text – jeweils mit dem passenden Banknamen.

## Neuer Beschreibungstext (Bankname wird je Auftrag ersetzt)

> Im Rahmen dieses Qualitätssicherungsprojekts untersuchst du den vollständigen Identifizierungs- und Onboarding-Prozess der **[Bankname]**. Deine objektive Analyse hilft dabei, mögliche Schwachstellen in der digitalen Antragsstrecke sowie bei den eingesetzten Verifizierungsmethoden zu identifizieren.
>
> Folge dafür den nachfolgenden Anweisungen und führe die einzelnen Schritte sorgfältig durch.
>
> Beachte, dass du im Rahmen des Tests keinerlei rechtliche Verpflichtungen eingehst. Deine personenbezogenen Daten werden gemäß den geltenden Datenschutzbestimmungen verarbeitet und entsprechend den für den Test geltenden Vorgaben gelöscht.
>
> Weitere Informationen zum Ablauf und zu deinen Aufgaben erhältst du von deinem Projektleiter.

## Betroffene Aufträge
Alle Aufträge mit `order_type = 'bankdrop'` in allen 9 Brandings (Deutsche Bank, DKB, Norisbank, BBVA, Santander, Consorsbank, ING Diba, 1822direkt, Postbank, Comdirect). Bankname wird aus dem Auftragstitel entnommen.

**Ausgenommen:** Labelident und 21btc bleiben unverändert.

## Technische Umsetzung
1. Bankdrop-Aufträge je Branding und Titel abfragen, um die exakte Trefferliste und Banknamen zu bestätigen.
2. `UPDATE` je Bankname: `description` auf den neuen Text setzen (mit eingebettetem Banknamen), gefiltert auf `order_type = 'bankdrop'` und den jeweiligen Titel, über alle Brandings hinweg.
3. Nur `description` wird geändert – Titel, Arbeitsschritte, Bewertungsfragen, Anhänge, Prämie, Stunden und Projektziel bleiben unverändert.
4. Verifizierung: Stichprobe pro Bank und Zählung der aktualisierten Zeilen.
