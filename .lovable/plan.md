# Slot manuell änderbar machen + Termin Kazimirov verschieben

## Ausgangslage (geprüft)

Am Fr, 07.08.2026 gibt es bei LIMEX Solutions zwei Buchungen um 15:00 Uhr:

```text
15:00  Slot 1  Stefanie Alexandra Kazimirov  (früher gebucht)
15:00  Slot 2  Valeriy Berov
15:20  frei
```

Die Slot-Nummer wird heute nirgends gespeichert. Sie entsteht rechnerisch aus der Buchungsreihenfolge (`interview_slots_for_branding` nummeriert pro Datum+Uhrzeit nach `created_at`). Deshalb lässt sich ein Termin aktuell nicht gezielt auf Slot 2 legen, wenn er als einziger auf dieser Uhrzeit liegt.

## Was gebaut wird

**1. Optionale manuelle Slot-Zuordnung**
Termine bekommen ein optionales Feld für den Slot. Ist es leer (Normalfall, alle Bestandstermine), gilt unverändert die bisherige automatische Logik nach Buchungsreihenfolge. Ist es gesetzt, gewinnt der manuell gewählte Slot.

**2. Slot in /admin/bewerbungsgespraeche ändern**
In der Terminliste wird der Slot als kleines Badge angezeigt. Ein Klick öffnet eine Auswahl mit den für das Branding konfigurierten Slots (aktuell Slot 1 und Slot 2) plus „Automatisch". Belegte Kombinationen aus Datum, Uhrzeit und Slot werden ausgegraut, damit kein Doppelbelegung entsteht. Uhrzeit/Datum bleiben über die bestehende Umbuchung änderbar.

**3. Kapazitätsprüfung bleibt korrekt**
Die öffentliche Buchungsseite zählt bei der Belegung künftig manuell gesetzte Slots mit, damit ein manuell auf Slot 2 gelegter Termin diese Spur wirklich blockiert und der freie Slot 1 weiter buchbar bleibt.

**4. Einmalige Korrektur**
Der Termin von Stefanie Alexandra Kazimirov wird von Fr, 07.08.2026 15:00 Uhr auf **15:20 Uhr, Slot 2** gesetzt. Valeriy Berov bleibt unverändert um 15:00 Uhr; er rutscht dadurch dort auf Slot 1. Es wird keine E-Mail und keine SMS ausgelöst.

## Technische Details

- Migration: `ALTER TABLE public.interview_appointments ADD COLUMN slot_index integer` (nullable, Default `null` = automatisch).
- `interview_slots_for_branding`: liefert `COALESCE(ia.slot_index, ROW_NUMBER() OVER (PARTITION BY date, time ORDER BY created_at))`; die automatische Nummerierung überspringt manuell belegte Slot-Nummern derselben Uhrzeit.
- `src/pages/admin/BewerbungsgespraecheSlot`-UI: Slot-Badge mit Popover/Select in `src/pages/admin/AdminBewerbungsgespraeche.tsx`, schreibt `slot_index` (bzw. `null`) und invalidiert die Termin-Queries.
- `src/pages/Bewerbungsgespraech.tsx`: Belegungsberechnung pro Spur berücksichtigt `slot_index`-Overrides zusätzlich zur Reihenfolge-Logik.
- Datenkorrektur per Update auf `interview_appointments` (`id = d7ca3145-2e32-4afa-85ae-2aef357c0d5b`): `appointment_time = '15:20'`, `slot_index = 2`.
