## Auswahl bei Suche beibehalten

Auf `/admin/mitarbeiter` wird die Mehrfachauswahl aktuell geleert, sobald sich der Suchbegriff ändert. Das soll weg.

### Änderung

- Der Reset-Effekt reagiert nur noch auf den **Branding-Wechsel** (dort passt der Datenbestand nicht mehr zur Auswahl).
- Tippen in der Suche und Blättern (Pagination) lassen die Auswahl unangetastet — gefundene Treffer können also über mehrere Suchen hinweg gesammelt werden.
- Beim Verlassen der Seite (Seitenwechsel/Route) wird die Auswahl automatisch verworfen, weil die Komponente ausgehängt wird — dafür ist kein Zusatzcode nötig.
- Aktionsleiste, Kopf-Checkbox (gilt weiter nur für die sichtbaren Zeilen) und Bulk-Aktionen (Sperren/Entsperren/Löschen über alle gemerkten IDs) bleiben unverändert.

### Technisch

Nur `src/pages/admin/AdminMitarbeiter.tsx`: In der Abhängigkeitsliste des Reset-Effekts (Zeile 64–66) `debouncedSearch` entfernen, sodass nur noch `activeBrandingId` überwacht wird.
