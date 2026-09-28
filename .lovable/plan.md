# Speichern im Zeitplan reparieren

## Ursache (in der Datenbank geprüft)
Beim Neuaufbau der Datenbank sind bei der Zeitplan-Tabelle zwei Dinge falsch geblieben:

1. **Fehlende Schreibrechte:** Angemeldete Nutzer haben keine Rechte auf die Tabelle der Zeitplan-Einstellungen. Die Regeln sind zwar da, aber ohne Grundrechte lehnt die Datenbank jedes Speichern ab. Das ist der Fehler, den du siehst.
2. **Alte Eindeutigkeits-Regel:** Es gibt noch eine alte Regel „nur eine Einstellung pro Branding und Typ". Sie verhindert, dass Slot 2, 3 … eigene Zeilen bekommen. Sobald die Rechte da sind, würde sonst Speichern auf Slot 2+ scheitern.

## Änderung (eine Datenbank-Anpassung, kein Code)
- Rechte vergeben: Lesen/Schreiben für angemeldete Nutzer, voller Zugriff für den Server, Lesen für Gäste (Buchungsseite).
- Alte Regel `UNIQUE (branding_id, schedule_type)` entfernen; die richtige Regel pro Slot bleibt.
- Dieselbe Rechte-Prüfung für die Tabellen der blockierten Zeiten (Gespräch, Probetag, 1. Arbeitstag) mitmachen und fehlende Rechte ergänzen, damit Blockieren nicht gleich danach scheitert.

## Technisch
```sql
GRANT SELECT ON public.branding_schedule_settings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.branding_schedule_settings TO authenticated;
GRANT ALL ON public.branding_schedule_settings TO service_role;
ALTER TABLE public.branding_schedule_settings
  DROP CONSTRAINT IF EXISTS branding_schedule_settings_branding_type_key;
-- analog Grants für *_blocked_slots-Tabellen, falls fehlend
```
Keine Termine oder Einstellungen werden verändert, keine Nachrichten verschickt.
