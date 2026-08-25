# Vendis an den gemeinsamen Arbeitstag-Kalender anschließen

## Ziel
Der Terminkalender für den ersten Arbeitstag von Vendis Development Services soll mit LIMEX Solutions und Codebricks zusammengelegt werden — genau wie LIMEX und Codebricks heute schon gekoppelt sind.

## Wie es heute funktioniert
Eine Datenbankfunktion (`fw_calendar_branding_ids`) bestimmt, welche Firmen sich einen Arbeitstag-Kalender teilen. Aktuell sind dort LIMEX und Codebricks als eine Gruppe hinterlegt; alle anderen Firmen stehen für sich allein. Die öffentliche Buchungsseite und die Verfügbarkeitsprüfung nutzen diese Gruppe, damit ein belegter oder blockierter Slot in einer Firma auch in der anderen nicht mehr buchbar ist.

## Änderung
- Vendis Development Services wird derselben Kalendergruppe hinzugefügt.
- Ergebnis: Termine und blockierte Zeitfenster von LIMEX, Codebricks und Vendis gelten gegenseitig — ein Slot kann nur einmal über alle drei Firmen hinweg gebucht werden.
- Bestehende Termine bleiben unverändert; es werden keine Daten gelöscht oder verschoben.

## Technische Umsetzung
- Eine Migration ersetzt `public.fw_calendar_branding_ids` so, dass das Array die drei IDs enthält:
  - LIMEX `371a2e6c-8a38-4c27-b4a4-34cf38694b1b`
  - Codebricks `56aa260c-f3bc-44d3-a37b-ceb3ba01d2d9`
  - Vendis `5b5c01e7-101a-4ce5-b65b-221a2eb8d653`
- Keine Frontend-Änderung nötig: `ErsterArbeitstag.tsx` und die Buchungs-RPCs lesen die Gruppe bereits über diese Funktion.

## Hinweis
Die Zeitplan-Einstellungen (Uhrzeiten, Wochentage, Vorlaufzeit) bleiben pro Branding getrennt. Wenn Vendis andere Zeiten als LIMEX/Codebricks eingestellt hat, sollten diese angeglichen werden — sag Bescheid, dann übernehme ich die LIMEX-Einstellungen auch für Vendis.
