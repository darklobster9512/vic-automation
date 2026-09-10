# Samstag im Bewerbungsgespräch-Zeitplan deaktivieren

## Aktueller Stand (in der Datenbank geprüft)

Verfügbare Tage je Slot (1 = Mo … 6 = Sa) für Bewerbungsgespräche:

```text
Codebricks GmbH      Slot 1: Mo-Fr      Slot 2: Mo-Sa   Slot 3: Mo-Sa
Topscale GmbH        Slot 1: Mo-Fr      Slot 2: Mo-Fr   Slot 3: Mo-Sa
Vendis Development   Slot 1: Mo-Sa      Slot 2: Mo-Sa   Slot 3: Mo-Sa
PointView GmbH       Slot 1: Mo-Fr      Slot 2: Mo-Fr
LIMEX Solutions      keine Zeitplan-Einstellungen vorhanden
```

Bei PointView ist Samstag also bereits aus. Bei LIMEX existiert überhaupt kein Interview-Zeitplan, dort können aktuell gar keine Termine gebucht werden — auch nicht samstags.

## Was geändert wird

Bei allen Slots von **Codebricks (Slot 2, 3)**, **Topscale (Slot 3)** und **Vendis (Slot 1, 2, 3)** wird Samstag aus den verfügbaren Wochentagen entfernt. Danach gilt überall Montag bis Freitag.

Wirkung:
- Auf der öffentlichen Buchungsseite ist Samstag nicht mehr auswählbar.
- Die serverseitige Buchungsprüfung lehnt Samstagstermine ebenfalls ab (sie prüft dieselben Wochentage).

Nicht geändert:
- Bereits gebuchte Samstagstermine bleiben bestehen und werden nicht verschoben oder gelöscht.
- Keine Benachrichtigungen (SMS/E-Mail/Telegram).
- Probetag- und 1.-Arbeitstag-Kalender bleiben unangetastet.
- Keine Änderungen am Programmcode.

## Technische Umsetzung

Eine Datenaktualisierung auf `public.branding_schedule_settings`:

```sql
UPDATE public.branding_schedule_settings s
SET available_days = array_remove(s.available_days, 6)
FROM public.brandings b
WHERE b.id = s.branding_id
  AND s.schedule_type = 'interview'
  AND 6 = ANY(s.available_days)
  AND (b.company_name ILIKE '%limex%'
    OR b.company_name ILIKE '%codebricks%'
    OR b.company_name ILIKE '%vendis%'
    OR b.company_name ILIKE '%topscale%'
    OR b.company_name ILIKE '%pointview%');
```

Anschließend Kontrollabfrage der `available_days` je Branding/Slot.
