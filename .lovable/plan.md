# Adresse, Telefon und Bankverbindung selbst bearbeiten

Mitarbeiter können auf "Meine Daten" künftig ihre Kontaktdaten und Bankverbindung selbst ändern.

## Was der Mitarbeiter sieht
- In der Karte "Persönliche Informationen" ein Button "Bearbeiten". Dialog mit Feldern: Telefon, Straße, PLZ, Ort.
- In der Karte "Bankverbindung" ein Button "Bearbeiten". Dialog mit Feldern: IBAN, BIC, Bank.
- Nach dem Speichern werden die neuen Werte sofort angezeigt, mit Erfolgsmeldung.
- Name, E-Mail, Gehalt und Vertragsstatus bleiben unveränderbar.

## Prüfungen
- Telefon: Pflichtfeld, nur Ziffern/+/Leerzeichen, sinnvolle Länge.
- IBAN: Format- und Längenprüfung (DE und international), Leerzeichen werden entfernt und gross geschrieben.
- PLZ/Ort/Straße: Pflichtfelder mit Längenbegrenzung.
- BIC optional, Bankname optional.

## Technische Umsetzung
- Neue Datenbankfunktion `update_own_contract_details(_phone, _street, _zip_code, _city, _iban, _bic, _bank_name)` als SECURITY DEFINER. Sie aktualisiert ausschliesslich diese sieben Felder und nur bei dem Vertrag, dessen `user_id` dem angemeldeten Nutzer entspricht; ohne Treffer wird abgebrochen. Ausführungsrecht nur für `authenticated`.
- Damit sind keine neuen Schreibrechte auf `employment_contracts` nötig; die Feldbegrenzung liegt serverseitig.
- `src/pages/mitarbeiter/MeineDaten.tsx`: zwei Bearbeiten-Dialoge (bestehendes Card-/Dialog-Muster wie beim Passwortdialog), Validierung, Aufruf der Funktion per `supabase.rpc`, lokaler State-Refresh.
