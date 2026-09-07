# Letzte Verweise auf die alte Datenbank ersetzen

## Befund

Im aktiven Code gibt es nur noch **eine** Stelle mit der alten Datenbank (`laozvnaupdecerpvwzmh`):

- `index.html`, Zeile 14/15: das kleine Startskript, das anhand der aufgerufenen Domain das passende Firmen-Favicon lädt. Es benutzt noch Adresse und Schlüssel des gelöschten Projekts, deshalb bleibt auf allen Kundendomains das Standard-Icon stehen.

Alle übrigen Treffer liegen in archivierten Planungsdokumenten unter `.lovable/plan/` — reine Notizen ohne Wirkung, die unverändert bleiben.

## Änderung

- In `index.html` Adresse und öffentlichen Schlüssel auf das aktuelle Projekt (`gzgfyuftjvezqjkosntu`) umstellen, Logik unverändert lassen.

## Test

- Projektweit prüfen, dass die alte Kennung in keinem Code mehr vorkommt.
- Favicon-Abfrage gegen die aktuelle Datenbank testen (Antwort mit Favicon-Adresse für eine bestehende Domain).
