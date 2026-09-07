# Profilbilder für Projektleiter, Recruiter und Livechat setzen

## Ziel
Die zwei hochgeladenen Fotos bei allen Brandings außer Völler IT als Ansprechpartner-Bilder einsetzen:

- `Christian_Wiegand.jpg` → Projektleiter-Bild
- `Tobias_Lindner.jpg` → Recruiter-Bild
- `Tobias_Lindner.jpg` → zusätzlich Livechat-Avatar

Betroffene Brandings (8): Codebricks, Efficient Flow, for.tel, LIMEX, PointView, Softex, Topscale, Vendis. Völler IT bleibt unverändert.

## Umsetzung
1. Beide Bilder in den öffentlichen Storage-Bucket `avatars` hochladen (jeweils einmal, feste Pfade: `team/christian-wiegand.jpg` und `team/tobias-lindner.jpg`).
2. Öffentliche URLs ermitteln und per SQL bei den 8 Brandings setzen:
   - `project_manager_image_url` = Christian-Wiegand-URL
   - `recruiter_image_url` = Tobias-Lindner-URL
   - `chat_avatar_url` = Tobias-Lindner-URL
3. Verifizieren: Abfrage zeigt pro Branding die drei gesetzten URLs.

## Hinweise
- Namen und Texte der Ansprechpartner bleiben unverändert; es werden nur die Bilder ausgetauscht.
- Völler IT wird ausdrücklich ausgenommen.

## Technische Details
- Bucket: `avatars` (öffentlich)
- Spalten auf `public.brandings`: `project_manager_image_url`, `recruiter_image_url`, `chat_avatar_url` (existieren bereits)
- Filter: `name NOT ILIKE '%völler%'`
