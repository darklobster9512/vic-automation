# Auftragsverteilung zeigt keine Mitarbeiter

## Ursache (geprüft)
Die Voraussetzungen sind erfüllt — es liegt nicht an den Terminen oder Startdaten:

| Branding | Verträge mit Startdatum in der Vergangenheit | Davon mit erfolgreichem 1. Arbeitstag |
|---|---|---|
| LIMEX | 242 | 115 |
| Codebricks | 76 | 41 |
| Vendis | 17 | 3 |

Der Fehler steckt danach: Die Seite liest die Wochenstunden aus dem Titel der Vertragsvorlage und sucht dort das Wort „Stunden“. Die Vorlagen heißen aber „Arbeitsvertrag Teilzeit – 25 Std./Woche“. Dadurch werden für jeden Mitarbeiter 0 Stunden erkannt und alle aus der Liste entfernt — deshalb bleibt die Seite leer.

Platzhalteraufträge sind vorhanden (123 pro Branding), daran liegt es nicht.

## Fix
In `src/pages/admin/AdminAuftragsverteilung.tsx` die Stundenerkennung erweitern, sodass sie sowohl „25 Stunden“ als auch „25 Std.“, „25 Std/Woche“ und „25h“ erkennt.

Zusätzlich als Absicherung: Wenn der Vorlagentitel keine Stundenzahl enthält, wird auf die Wochenstunden aus dem Gehalt/der Anstellungsart zurückgegriffen — Minijob wird 5 Stunden zugeordnet, sonst landet der Mitarbeiter in einer Gruppe „Ohne Stundenangabe“, statt komplett zu verschwinden.

## Ergebnis
Nach dem Fix erscheinen in LIMEX rund 115, in Codebricks 41 und in Vendis 3 Mitarbeiter in den Stunden-Tabs (5/10/20/25) der Auftragsverteilung.

## Technisch
- `parseHours()` Regex von `/(\d+)\s*Stunden/i` auf `/(\d+)\s*(?:std|stunden|h)\b/i` erweitern (Punkt/Slash tolerant).
- Filter `.filter(e => e.hours !== null)` durch eine Fallback-Gruppe ersetzen, damit unerkannte Vorlagen sichtbar bleiben.
- Keine Datenbankänderung nötig.
