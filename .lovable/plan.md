# PLZ und Stadt in einer Zeile (Vertragsvorlagen)

## Ausgangslage
Alle 13 Vertragsvorlagen enthalten im Adressblock die Platzhalter in vier getrennten Absätzen:

```text
{{ Name }}
{{ Strasse }}
{{ PLZ }}
{{ Stadt }}
```

Dadurch stehen PLZ und Stadt im gerenderten Vertrag untereinander.

## Änderung
Die beiden Absätze werden zu einem zusammengeführt:

```text
{{ Name }}
{{ Strasse }}
{{ PLZ }} {{ Stadt }}
```

Umsetzung als einmaliges Daten-Update auf der Tabelle `contract_templates`: Der Absatz mit `{{ Stadt }}` wird entfernt und `{{ Stadt }}` direkt hinter `{{ PLZ }}` (mit Leerzeichen) in denselben Absatz gesetzt. Betrifft alle 13 Vorlagen über alle Brandings hinweg; Zentrierung und restlicher Text bleiben unverändert.

## Technische Details
- Regex-basiertes SQL-Update: `{{ PLZ }}</p><p ...>{{ Stadt }}` → `{{ PLZ }} {{ Stadt }}`, tolerant gegenüber Leerzeichen-Varianten.
- Keine Code-Änderung nötig – die Platzhalter-Ersetzung in `MitarbeiterArbeitsvertrag.tsx` und `MeineDaten.tsx` funktioniert unverändert.
- Bereits unterzeichnete Verträge (PDFs) bleiben unberührt; nur künftige Anzeigen/Unterzeichnungen nutzen das neue Layout.
