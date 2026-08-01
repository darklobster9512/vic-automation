## Ziel
Auf `/admin/idents` soll der Bereich „Abgeschlossen" nicht mehr alle Sessions direkt auflisten.

## Umsetzung (nur `src/pages/admin/AdminIdents.tsx`)

1. **Aufteilen der Daten**
   - `completedSessions` wird in zwei Listen getrennt: `status === "completed"` (Abgeschlossen) und `status === "cancelled"` (Abgebrochen). Suche/Filter bleibt für beide aktiv.

2. **Collapsible Sektion**
   - Die gesamte Sektion wird in ein `Collapsible` (shadcn, `@/components/ui/collapsible`) gepackt, standardmäßig **zugeklappt**.
   - Trigger: Zeile mit Überschrift „Archiv" + Gesamtanzahl-Badge + Chevron-Icon (rotiert beim Öffnen).

3. **Tabs innerhalb der Sektion**
   - Beim Aufklappen erscheinen shadcn-`Tabs` mit zwei Triggern: „Abgeschlossen (n)" und „Abgebrochen (n)".
   - Jeder Tab zeigt die bestehenden Karten im gleichen Design wie bisher; leerer Tab zeigt einen dezenten Hinweistext.

4. Aktiv- und Ausstehend-Sektionen bleiben unverändert.

## Technisch
Rein Frontend/Presentation, keine Query- oder Datenänderungen. Falls `collapsible.tsx` nicht existiert, wird es als shadcn-Standardkomponente ergänzt.