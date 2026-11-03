# Karriere-Iframe pro Branding

## Was sich ändert
- In den Branding-Einstellungen gibt es ein neues Feld **„Karriere-Seite (Iframe-URL)"**.
- Die Seite `/karriere` erkennt anhand der aufgerufenen Domain das Branding und zeigt die dort eingetragene URL im Iframe.
- Ist für das Branding nichts eingetragen oder wird kein Branding erkannt, wird wie bisher `https://bbm-consult.solutions/karriere/onlineprozess-tester` angezeigt.
- Das bbm-consulting-Branding bekommt die aktuelle URL direkt eingetragen.

## Technische Details
- Migration: `ALTER TABLE brandings ADD COLUMN karriere_iframe_url text`.
- `AdminBrandingForm.tsx`: Eingabefeld (URL, optional) laden/speichern.
- `KarriereRedirect.tsx`: Branding per Hostname über `publicSupabase` bestimmen (Domain bzw. `additional_domains`, Präfix wie `web.`/`portal.` entfernen – gleiche Logik wie die bestehende Domain-Erkennung), `karriere_iframe_url` lesen, sonst Fallback. Kurzer Ladezustand, um Flackern zu vermeiden.
