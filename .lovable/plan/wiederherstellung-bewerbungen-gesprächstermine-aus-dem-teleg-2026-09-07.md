# Wiederherstellung: Bewerbungen & Gesprächstermine aus dem Telegram-Export

Aus der hochgeladenen Telegram-Datei (4.509 Nachrichten, 29.07. – 06.09.2026) werden die verlorenen Bewerbungen und Gesprächstermine zurück ins Panel geschrieben. Beide Tabellen sind aktuell leer, es wird also nichts überschrieben.

## Was in der Datei steckt

- 3.265 Meldungen "Neue Bewerbung eingegangen" – mit Name, E-Mail, Telefon, Art (Minijob/Teilzeit), Lebenslauf ja/nein, Zeitpunkt. **Kein Branding.**
- 1.240 Meldungen zu Kennenlern-/Bewerbungsgesprächen (gebucht + umgebucht) – mit Name, Telefon, E-Mail, Termin, Uhrzeit und **Branding**: LIMEX 811, Codebricks 304, Vendis 121, PointView 4.
- Rund 900 der Termin-E-Mails lassen sich direkt einer Bewerbung zuordnen.

## Vorgehen

1. **Bewerbungen einlesen und entdoppeln**: pro E-Mail (ersatzweise Telefonnummer) bleibt der neueste Eintrag stehen. Erwartet ca. 2.700 statt 3.265 Datensätze.
2. **Termine zuordnen**: Match über E-Mail, sonst über normalisierte Telefonnummer, sonst über Name. Der zugehörigen Bewerbung wird das Branding aus der Terminmeldung gesetzt.
3. **Termine anlegen**: pro Person nur der zuletzt gebuchte Termin (Umbuchungen ersetzen die frühere Buchung). Status "gebucht", Bewerbungsstatus "termin_gebucht".
4. **Rest zu LIMEX**: alle Bewerbungen ohne Branding und ohne Termin landen im LIMEX-Branding.
5. **Termine ohne passende Bewerbung** (ca. 100): dafür wird eine Bewerbung aus den Termindaten erzeugt, damit der Termin im Panel korrekt hängt.

## Technische Details

- Datenquelle wird per Skript geparst und als SQL-Insert-Batches eingespielt (`applications`, danach `interview_appointments`).
- Felder: `first_name`, `last_name`, `email` (lowercase), `phone`, `employment_type`, `branding_id`, `created_at` = Telegram-Zeitstempel, `status`.
- Nicht rekonstruierbar (in den Meldungen nicht enthalten): Adresse/PLZ/Ort, Lebenslauf-Dateien, Slot-Nummer der Termine, Quelle (Indeed/Meta/extern). Slots werden über die bestehende Auto-Zuordnung aufgelöst.
- Vor dem Schreiben zeige ich dir kurz die Zählung (Bewerbungen je Branding, Termine je Branding).
