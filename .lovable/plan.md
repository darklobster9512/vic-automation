# Projektleiter, Recruiter & Livechat-Anzeigenamen setzen

## Ziel
Bei 7 Brandings Projektleiter und Recruiter hinterlegen und den Livechat-Anzeigenamen auf das Muster „Projektleitung / Support – <Projektleitername>" setzen.

## Daten je Branding

| Branding | Projektleiter | Recruiter | Chat-Anzeigename |
|---|---|---|---|
| Vendis Development Services GmbH | Marcel Hübner | Florian Steinbach | Projektleitung / Support - Marcel Hübner |
| Codebricks GmbH | Tobias Lindner | Christian Wiegand | Projektleitung / Support - Tobias Lindner |
| LIMEX Solutions GmbH | Markus Brenner | Julian Vollmer | Projektleitung / Support - Markus Brenner |
| PointView GmbH | Tobias Reimers | Lukas Krüger | Projektleitung / Support - Tobias Reimers |
| Softex Unternehmensberatung & Software GmbH | Tobias Wendt | Andreas Lehmann | Projektleitung / Support - Tobias Wendt |
| Topscale GmbH | Fabian Ostermann | Jonas Wolters | Projektleitung / Support - Fabian Ostermann |
| Völler IT Solutions GmbH | Michael Winterfeld | Jonas Hagenauer | Projektleitung / Support - Michael Winterfeld |

Efficient Flow und for.tel bleiben unberührt (keine Angaben).

## Umsetzung
- Ein `UPDATE public.brandings` pro Branding mit:
  - `project_manager_name` = Projektleiter-Name (Titel/Bild unverändert)
  - `recruiter_name` = Recruiter-Name (Titel/Bild unverändert)
  - `chat_display_name` = „Projektleitung / Support - <Projektleitername>"
- Keine Schemaänderung, keine weiteren Felder.
- Verifizierung per Read-Query: alle 7 Brandings mit den drei gesetzten Feldern.

## Hinweis
Der Anzeigename wird in `/admin/livechat-einstellungen` sichtbar und kann dort jederzeit überschrieben werden.
