# Branding-Favicon wieder korrekt laden

## Befund (geprüft)
1. **Favicon-Erkennung beim Seitenaufruf fragt die gelöschte Datenbank ab.** Das kleine Skript im Seitenkopf, das anhand der Domain das Favicon setzt, ist noch fest auf die alte Datenbank (`gzgfyuftjvezqjkosntu`) eingestellt. Die Anfrage läuft ins Leere, darum bleibt überall das Standard-Icon – auch bei Codebricks, Vendis und Denaro, deren Favicons eigentlich vorhanden sind.
2. **Bei 5 Brandings zeigt das gespeicherte Favicon (und Logo) auf den Speicher der gelöschten Datenbank:** LIMEX, PointView, Völler IT, Softex, Topscale. Diese Bilddateien existieren nicht mehr und können nicht wiederhergestellt werden.
   - In Ordnung: Codebricks, Vendis, Denaro (Dateien im aktuellen Speicher).
   - Kein Favicon hinterlegt: for.tel, Efficient Flow.

## Änderungen
1. `index.html`: Skript auf die aktuelle Datenbank umstellen. Zusätzlich:
   - auch die „Weiteren Domains" eines Brandings berücksichtigen (nicht nur die Hauptdomain),
   - volle Domain und Root-Domain prüfen (z. B. `app.codebricks-gmbh.com` → `codebricks-gmbh.com`).
2. Bei den 5 Brandings mit toten Bild-Adressen die Felder Favicon/Logo nicht automatisch leeren – stattdessen fällt die Seite sauber auf das Standard-Icon zurück, wenn das Bild nicht lädt (kein kaputtes Icon).
3. Die Seiten (1. Arbeitstag, Bewerbungsgespräch, Probetag, Buchung, Admin) setzen das Favicon bereits pro Branding – daran ändert sich nichts.

## Was du danach tun musst
- Bei **LIMEX, PointView, Völler IT, Softex, Topscale** unter Brandings Favicon und Logo einmal neu hochladen. Danach erscheinen sie automatisch auf allen Seiten dieser Domains.

## Test
- Seite mit Codebricks-/Vendis-Domain simulieren: Branding-Favicon muss erscheinen.
- Nach Veröffentlichung auf der Live-Domain prüfen.
