## Auswahl über Seitenwechsel hinweg merken

Aktuell wird die Auswahl bei jedem Seitenwechsel geleert. Das wird geändert.

### Änderung

- Der Effekt, der die Auswahl zurücksetzt, reagiert **nicht mehr auf `page`** — nur noch auf Suchbegriff und Branding-Wechsel (dort passt der Datenbestand nicht mehr zur Auswahl).
- Beim Blättern bleiben markierte Mitarbeiter also erhalten und werden beim Zurückblättern wieder als angehakt angezeigt.
- Die Kopf-Checkbox bezieht sich weiterhin nur auf die aktuell sichtbare Seite (wählt sie an bzw. ab), zerstört aber nicht die Auswahl anderer Seiten.

### Aktionsleiste

- Bleibt sichtbar, solange irgendetwas ausgewählt ist — auch wenn auf der gerade angezeigten Seite kein markierter Eintrag liegt.
- Zusatz-Hinweis im Badge, wenn die Auswahl über die aktuelle Seite hinausgeht, z. B. „12 ausgewählt (seitenübergreifend)".
- Sperren / Entsperren / Löschen arbeiten unverändert auf allen gespeicherten IDs, also auch auf denen anderer Seiten.

### Technisch

Nur `src/pages/admin/AdminMitarbeiter.tsx`: Abhängigkeitsliste des Reset-Effekts anpassen und die Badge-Beschriftung um den seitenübergreifenden Hinweis ergänzen.
