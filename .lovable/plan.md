# Plan: Hardcoded Ansprechpartner-Name auf /bewerbungsgespraech/buchen entfernen

## Ziel
Auf der öffentlichen Buchungsseite steht im Intro-Text der fest eingetragene Name „Jonas Hagenauer". Der Satz soll stattdessen dynamisch den Recruiter-Namen des aktiven Brandings verwenden — denselben, der auch in der Ansprechpartner-Karte darüber angezeigt wird.

## Änderung
Datei: `src/pages/BewerbungsgespraechPublic.tsx` (Zeile ~304)

- Den hardcodierten Namen durch `branding?.recruiter_name` ersetzen.
- Fallback, falls kein Recruiter im Branding hinterlegt ist: Satz ohne Namen anzeigen, z. B. „Ihr persönlicher Ansprechpartner begleitet Sie durch den Bewerbungsprozess und beantwortet Ihre Fragen."

## Technische Details
- `branding.recruiter_name` wird bereits im bestehenden Branding-Select geladen und für die `ContactCard` verwendet — keine neue Datenabfrage nötig.
- Rendering mit Bedingung: Name vorhanden → Name fett einfügen; sonst generischer Satz.
- Keine weiteren Seiten betroffen (die individuelle Buchungsseite enthält diesen Satz nicht).

## Verifikation
- TypeScript-Check läuft fehlerfrei.
- Kurzer Sichtcheck der Seite mit einem Branding mit Recruiter und einem ohne.
