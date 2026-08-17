# Vertragsvorlagen von LIMEX zu Codebricks kopieren

## Ziel
Codebricks GmbH hat aktuell keine Vertragsvorlagen. Die vier Vorlagen von LIMEX Solutions werden übernommen und die Unternehmensdaten im Vertragstext auf Codebricks umgestellt.

## Vorlagen, die kopiert werden
| Titel | Art | Gehalt |
|---|---|---|
| Minijob 5 Stunden/Woche | Minijob | 603 € |
| Teilzeit - 10 Stunden/Woche | Teilzeit | 1.206 € |
| Teilzeit - 20 Stunden/Woche | Teilzeit | 2.412 € |
| Teilzeit - 25 Stunden/Woche | Teilzeit | 2.976 € |

Alle vier werden bei Codebricks aktiv angelegt; Titel, Anstellungsart, Gehalt und Vertragstext bleiben ansonsten identisch.

## Datenaustausch im Vertragstext
| Alt (LIMEX) | Neu (Codebricks) |
|---|---|
| LIMEX Solutions GmbH | Codebricks GmbH |
| Ivan Kulinstev | Erik Andreas Hübner |
| Blankenhainer Str. 5 | Leipziger Platz 15 |
| 12249 Berlin | 10117 Berlin |
| HRB 68637 B | HRB 258971 B |
| DE190275864 | DE458097140 |
| limex-solutions.gmbh / kontakt@limex-solutions.net | codebricks.gmbh / kontakt@codebricks-gmbh.de |
| 030 754387430 | 030 692096720 |

Registergericht bleibt Amtsgericht Charlottenburg (Berlin), da für beide gleich.

## Technisches
- Reine Datenoperation in `contract_templates`: vier neue Zeilen mit `branding_id` von Codebricks, Inhalt per Textersetzung aus den LIMEX-Vorlagen.
- Die LIMEX-Vorlagen bleiben unverändert.
- Keine Code-Änderung nötig.
