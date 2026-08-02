## Ziel
Der Satz „Michael Schreiber wird Sie anschließend telefonisch kontaktieren…“ soll den bei dem jeweiligen Branding hinterlegten Projektleiter-Namen (`project_manager_name`) verwenden.

## Fundstellen
Der Name ist an genau zwei Stellen hartcodiert:
1. `src/pages/admin/AdminArbeitsvertraege.tsx` (Zeile 173) – echte „Vertrag genehmigt“-E-Mail
2. `src/pages/admin/AdminEmails.tsx` (Zeile 228) – Vorschau-Template „Vertrag genehmigt“

## Umsetzung
1. **AdminArbeitsvertraege.tsx**: Vor dem Versand den Projektleiter-Namen des ermittelten `brandingId` aus der Tabelle `brandings` laden (`project_manager_name`). Zeile dynamisch bauen: `"<Name> wird Sie anschließend telefonisch kontaktieren, um mit Ihnen die ersten Aufträge durchzugehen."`. Ist kein Projektleiter hinterlegt, entfällt die Zeile komplett (statt eines falschen Namens).
2. **AdminEmails.tsx**: Die Vorschau-Templates erhalten zusätzlich den Projektleiter-Namen des ausgewählten Brandings. Dazu `project_manager_name` in die bestehende `brandings`-Abfrage aufnehmen und die Zeile im Template `vertrag_genehmigt` entsprechend dynamisch rendern (ohne hinterlegten Namen: Zeile weglassen).

## Technische Details
- Keine Datenbankänderungen nötig, `project_manager_name` existiert bereits auf `brandings` und wird im Branding-Formular gepflegt.
- Keine Änderungen an Edge Functions oder der E-Mail-Queue erforderlich, da die Textzeilen clientseitig zusammengestellt werden.
