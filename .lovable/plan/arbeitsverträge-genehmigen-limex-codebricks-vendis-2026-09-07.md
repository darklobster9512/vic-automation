# Arbeitsverträge genehmigen (LIMEX, Codebricks, Vendis)

## Ziel
Alle Arbeitsverträge mit Status "eingereicht" in den Brandings LIMEX Solutions, Codebricks und Vendis, deren Startdatum am oder vor dem 04.09. liegt, werden auf "genehmigt" gesetzt. Verträge mit späterem Startdatum bleiben unverändert auf "eingereicht".

## Hinweis zum Datum
In der Datenbank stehen alle Startdaten im Jahr 2026 (aktuelles Datum: 07.09.2026). Die Grenze wird daher als **04.09.2026** angewendet.

## Betroffene Verträge (aktueller Stand)
| Branding | wird genehmigt | bleibt eingereicht |
|---|---|---|
| LIMEX Solutions | 39 | 13 |
| Codebricks | 4 | 17 |
| Vendis | 2 | 4 |
| **Summe** | **45** | **34** |

## Vorgehen
- Reine Datenänderung per SQL-Update auf den Status der betroffenen Verträge.
- Es werden **keine** SMS und **keine** E-Mails versendet (Direktupdate, kein Genehmigungs-Workflow).
- Verträge ohne Startdatum oder mit anderem Status bleiben unangetastet.
- Anschließende Kontrollabfrage der neuen Statusverteilung.
