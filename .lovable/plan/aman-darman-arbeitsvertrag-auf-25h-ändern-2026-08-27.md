# Aman Darman Arbeitsvertrag auf 25h ändern

## Ziel
Den bestehenden Arbeitsvertrag von Adam Darman (Codebricks GmbH) von der aktuellen Vorlage "Teilzeit - 20 Stunden/Woche" auf "Teilzeit - 25 Stunden/Woche" umstellen.

## Ist-Zustand (bestätigt)
- Vertrag ID: `8d3be8a8-074e-4047-94bf-cd2de727cefa`
- Name: Adam Darman
- Aktuelle Vorlage: Teilzeit - 20 Stunden/Woche (ID: `b26ac143-8be2-4854-83cd-ed4457f91893`, Gehalt: 2.412 €)
- Status: genehmigt

## Zielvorlage (bestätigt)
- Vorlage: Teilzeit - 25 Stunden/Woche
- ID: `5002b3a1-26d7-494d-86f5-54058226f9ee`
- Gehalt: 2.976 €

## Durchführung
1. `employment_contracts` Datensatz für Adam Darman aktualisieren:
   - `template_id` → `5002b3a1-26d7-494d-86f5-54058226f9ee`
   - `employment_type` → `teilzeit`
2. Bestehende PDFs (`contract_pdf_url`, `signed_contract_pdf_url`) bleiben unverändert; ein neues PDF wird erst bei der nächsten Generierung erzeugt.
3. Änderung per `supabase--run_sql` ausführen.
