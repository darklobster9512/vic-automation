# App-Download-Buttons bei den Ident-Daten

## Ziel
Auf der Ident-Seite im Mitarbeiter-Portal (`/mitarbeiter/auftraege/:id`, Video-Ident-Ansicht) sollen die App-Download-Links des Auftrags direkt bei den Test-Daten sichtbar sein – mit den hochgeladenen App-Store- und Google-Play-Badges als Buttons.

## Was gebaut wird
1. Die beiden hochgeladenen Bilder kommen als `public/appstore.png` und `public/googleplay.png` in den Public-Ordner.
2. In der Test-Daten-Card der Ident-Ansicht wird ein neuer Block "App herunterladen" ergänzt – sichtbar nur, wenn beim Auftrag `appstore_url` und/oder `playstore_url` hinterlegt ist. Nur der jeweils hinterlegte Link wird angezeigt.
3. Die Badges sind anklickbare Links (neuer Tab), Höhe ca. 40px, mit leichtem Hover-Effekt.
4. Die bestehenden Download-Karten in Vorbereitung und Ident-Ansicht nutzen künftig dieselben PNG-Badges statt der bisherigen SVGs, damit alles einheitlich aussieht.

## Technische Details
- Datei: `src/pages/mitarbeiter/AuftragDetails.tsx` (Video-Ident-Step, Test-Daten-Card; zusätzlich die vorhandenen Downloads-Karten bei Zeile ~648 und ~793).
- Bilder werden aus `/mnt/user-uploads/` nach `public/` kopiert und über absolute Pfade (`/appstore.png`, `/googleplay.png`) referenziert; die bisherigen SVG-Imports aus `src/assets` entfallen in dieser Datei.
- Keine Datenbank- oder Backend-Änderungen; die Felder `appstore_url` / `playstore_url` existieren bereits am Auftrag.
