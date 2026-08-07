# Neue Buchung landet auf blockiertem Slot 1 statt Slot 3

## Ursache (in der Datenbank geprüft)

Für Fr, 07.08.2026, 16:00 Uhr bei LIMEX Solutions gilt:

```text
Slot 1   16:00  blockiert (schedule_blocked_slots)
Slot 2   endet um 16:00  -> bietet 16:00 gar nicht an
Slot 3   16:00  frei
Buchung  16:00  Igor D., manuell slot_index = 2
Buchung  16:00  Demo Bewerbung (heute 10:54), slot_index = NULL
```

Die Buchungsseite schreibt beim Anlegen eines Termins **keine Slot-Nummer**. Das Feld bleibt leer, und die Slot-Nummer wird erst nachträglich rechnerisch vergeben: die Auflösung nimmt einfach die **kleinste noch nicht manuell belegte Nummer** — hier die 1. Dass Slot 1 zu dieser Uhrzeit blockiert ist und dass Slot 2 um 16:00 gar nicht mehr existiert, wird bei dieser Vergabe nirgends berücksichtigt. Deshalb erscheint der neue Termin auf Slot 1 statt auf Slot 3.

## Was gebaut wird

**1. Uhrzeit nur bei einer konkret freien Spur anzeigen**
Die öffentliche Buchungsseite ermittelt für jede Uhrzeit die konkret buchbaren Spuren: Die Spur muss die Uhrzeit anbieten, darf nicht blockiert und nicht belegt sein. Ist diese Menge leer, wird die Uhrzeit ausgegraut und kann gar nicht ausgewählt werden. Eine Buchung ohne eindeutig zuweisbare freie Spur ist nicht zulässig.

**2. Freie Spur beim Buchen atomar reservieren**
Beim Absenden prüft eine Datenbankfunktion dieselben Regeln erneut und weist den Termin direkt einer freien Spur zu. Damit können auch zwei gleichzeitige Buchungen nicht dieselbe letzte freie Spur erhalten. Falls die Spur zwischen Anzeige und Klick vergeben wurde, wird kein Termin angelegt und die Uhrzeit anschließend ausgegraut.

**3. Automatische Nachvergabe wird spurbewusst**
Für Termine ohne gespeicherte Nummer (alle Bestandstermine) überspringt die Auflösung künftig Spuren, die zu dieser Uhrzeit blockiert sind oder die Uhrzeit außerhalb ihrer Start-/Endzeit haben. So kann kein Termin mehr auf einer blockierten Spur angezeigt werden.

Bestehende Termine werden nicht verschoben und keine Blockierungen entfernt.

## Technische Details

- `src/pages/Bewerbungsgespraech.tsx`: Verfügbarkeit ausschließlich aus konkret freien Spuren bilden. Beim Buchen nicht mehr direkt löschen und neu einfügen, sondern die atomare Buchungs-RPC aufrufen; bei Konflikt Belegung neu laden, Auswahl entfernen und Fehlermeldung anzeigen.
- Migration: neue `SECURITY DEFINER`-RPC für öffentliche Terminbuchungen. Sie sperrt die relevante Branding-/Datum-/Uhrzeit-Kombination transaktionssicher, berechnet gültige freie Spuren unter Berücksichtigung von Zeitfenstern, globalen und spurbezogenen Blockierungen sowie bestehenden manuellen/automatischen Belegungen, und schreibt `slot_index` direkt. Bei Umbuchung wird der alte Termin erst innerhalb derselben erfolgreichen Transaktion ersetzt.
- Migration: `interview_slots_for_branding` und `interview_booked_slots_for_branding` erweitern — die automatische Nummerierung wählt aus `generate_series(1, interview_slots_per_time)` nur Spuren, für die (a) keine Zeile in `schedule_blocked_slots` mit passendem `branding_id`/`blocked_date`/`blocked_time` und `slot_index` (bzw. `slot_index IS NULL`) existiert und (b) die Uhrzeit in `[start_time, end_time)` der jeweiligen `branding_schedule_settings`-Zeile (`schedule_type = 'interview'`, Fallback Slot 1) liegt; manuell gesetzte `slot_index` bleiben unverändert Vorrang.
- Keine Datenänderung an bestehenden Terminen in diesem Schritt.
