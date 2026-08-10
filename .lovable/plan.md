# Auftragsverteilung und BD Status für Kunden ausblenden

Kunden- (und Caller-)Accounts sollen die Menüpunkte "Auftragsverteilung" und "BD Status" nicht mehr sehen und die Seiten auch nicht direkt über die URL aufrufen können.

## Änderungen

1. `src/components/admin/AdminSidebar.tsx` — `/admin/auftragsverteilung` und `/admin/bd-status` zur Liste `KUNDE_HIDDEN_PATHS` hinzufügen, damit die Reiter für `kunde` und `caller` verschwinden.
2. `src/components/admin/AdminLayout.tsx` — dieselben zwei Pfade in `KUNDE_BLOCKED_PATHS` ergänzen, sodass ein direkter URL-Aufruf zurück auf `/admin` leitet.

Keine Datenbank- oder Backend-Änderungen nötig.
