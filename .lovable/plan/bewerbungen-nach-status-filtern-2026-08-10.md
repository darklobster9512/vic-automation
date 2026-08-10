# Bewerbungen nach Status filtern

## Ziel
Bei `/admin/bewerbungen` drei Tabs ergänzen, zwischen denen die Bewerbungen nach Status gefiltert werden können:

- **Neu**
- **Bewerbungsgespräch**
- **Termin gebucht**

Abgelehnte Bewerbungen werden in dieser Ansicht nicht angezeigt.

## Umsetzung
1. Einen lokalen Tab-Status mit `neu` als Standard ergänzen.
2. Eine `Tabs`-Navigation nach dem Statistikbereich und vor der Bewerbungstabelle einbauen.
3. Pro Tab die Anzahl der passenden Bewerbungen anzeigen.
4. Die Tabelle ausschließlich mit den Bewerbungen des aktiven Status rendern.
5. Die vorhandene Auswahl- und Bulk-Akzeptieren-Funktion auf die sichtbaren neuen Bewerbungen abstimmen; Aktionen, Detaildialog und bestehende Datenabfragen bleiben unverändert.
6. Für leere Status-Tabs eine passende leere Ansicht anzeigen, ohne die globale „keine Bewerbungen vorhanden“-Ansicht zu verändern.

## Technische Details
- Verwendung der bestehenden `Tabs`, `TabsList`, `TabsTrigger`-Komponenten und semantischer Badge-/Text-Tokens.
- Die Filterung erfolgt clientseitig auf den bereits geladenen Bewerbungen.
- Die Statuswerte werden an der bestehenden `statusConfig`-Logik ausgerichtet: `neu`, `bewerbungsgespraech` und `termin_gebucht`.
- Keine Änderungen an Datenbank, Statusübergängen, Benachrichtigungen oder Routen.