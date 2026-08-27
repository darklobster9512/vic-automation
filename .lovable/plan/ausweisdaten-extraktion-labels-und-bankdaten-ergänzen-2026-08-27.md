# Ausweisdaten-Extraktion: Labels und Bankdaten ergänzen

## Ziel
Der extrahierte Textblock im KYC-Tab (`/admin/mitarbeiter/:id`) wird erweitert:

```text
Dominik Hubertus Alfons Bergschneider
16.05.1993 in Rheine
Wilhelm-Busch-Str. 18 A
49479 Ibbenbüren
Familienstand: verheiratet
Steuer-ID: 12345678901
Aktuelle Bank: Deutsche Bank
```

- Vor dem Familienstand steht jetzt das Label `Familienstand:`.
- Darunter kommen zwei neue Zeilen aus den „Persönliche Daten" des Vertrags:
  - `Steuer-ID:` aus `contract.tax_id`
  - `Aktuelle Bank:` nur der Bankname aus `contract.bank_name` (kein IBAN/BIC)
- Zeilen werden nur ausgegeben, wenn der jeweilige Wert vorhanden ist.

## Änderung
- `src/pages/admin/AdminMitarbeiterDetail.tsx` (Extraktions-Handler um Zeile ~978):
  - `Familienstand: ${contract.marital_status}` statt nacktem Wert
  - `if (contract.tax_id) lines.push("Steuer-ID: " + contract.tax_id)`
  - `if (contract.bank_name) lines.push("Aktuelle Bank: " + contract.bank_name)`

## Nicht im Scope
- Keine Änderung an der Edge Function `extract-id-data` oder am Extraktionsformat der Ausweisdaten.
