# Öffentliche Terminbuchung wieder erreichbar machen

## Problem

Die Seite `/bewerbungsgespraech/:id` lädt für Besucher ohne Login endlos (nur graue Platzhalter). Grund: alle öffentlichen Seiten benutzen eine separate, sitzungsfreie Verbindung, die noch fest auf das **alte, gelöschte Datenbankprojekt** (`laozvnaupdecerpvwzmh`) zeigt. Jede Anfrage von dort läuft ins Leere.

Geprüft und in Ordnung: Bewerbungsdaten, Branding, Zeitpläne, blockierte Slots und die Buchungsfunktion sind für anonyme Besucher in der aktuellen Datenbank freigegeben (Rechte und Zugriffsregeln passen, Testabruf der Beispielbewerbung liefert Daten).

## Änderungen

1. `src/integrations/supabase/publicClient.ts` auf das aktuelle Projekt umstellen (gleiche Adresse/Schlüssel wie der Hauptclient, weiterhin ohne Sitzung/Speicherung), damit Login-Status die öffentliche Ansicht nicht beeinflusst.
2. Zwei weitere fest verdrahtete Aufrufe auf die alte Adresse korrigieren:
   - `src/pages/admin/AdminMitarbeiterDetail.tsx` (`create-employee-account`)
   - `src/components/mitarbeiter/ContractSigningView.tsx` (`sign-contract`)
3. Prüfen, dass keine weitere Stelle im Code die alte Projektadresse verwendet.

## Test

- Buchungsseite im anonymen Browserfenster öffnen: Name, Firmenlogo, Ansprechpartner und Kalender müssen erscheinen.
- Einen freien Termin buchen und die Bestätigung sowie den Eintrag in der Terminliste prüfen.
