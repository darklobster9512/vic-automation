# Fahima Tarin – Telefonnummer korrigieren (Codebricks)

## Ziel
Im Arbeitsvertrag von Fahima Tarin im Branding "Codebricks GmbH" soll die Telefonnummer von der aktuell falsch eingetragenen E-Mail-Adresse auf `0155 67655864` geändert werden.

## Aktueller Stand (bestätigt)
- Branding "Codebricks GmbH": `56aa260c-f3bc-44d3-a37b-ceb3ba01d2d9`
- Vertrag ID: `2f665912-f39a-4f7c-9084-c2e50fc8e65e`
- Aktueller Wert in `employment_contracts.phone`: `fahimatarin14@gmail.com`

## Durchführung
1. `UPDATE employment_contracts SET phone = '0155 67655864' WHERE id = '2f665912-f39a-4f7c-9084-c2e50fc8e65e'` ausführen.
2. Ergebnis kurz verifizieren.

## Hinweis
Dies ist eine reine Datenkorrektur, keine Schema- oder Code-Änderung.