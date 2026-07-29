## Ziel
Im Mitarbeiter-Dashboard soll ein Klick auf die Karte "Offene Aufträge" zu `/mitarbeiter/auftraege` navigieren.

## Umsetzung
In `src/pages/mitarbeiter/MitarbeiterDashboard.tsx`:

1. Im `stats`-Array bekommt der Eintrag "Offene Aufträge" ein zusätzliches optionales Feld `href: "/mitarbeiter/auftraege"` (Typ des Arrays entsprechend erweitern).
2. Im Render-Block (`stats.map`) wird die `Card` bei vorhandenem `href` per `useNavigate()`-Klick-Handler navigierbar gemacht, inkl. `cursor-pointer`, `role="button"`, `tabIndex={0}` und Enter-/Space-Tastaturunterstützung für Barrierefreiheit.
3. Optik bleibt unverändert (bestehende Hover-Effekte greifen bereits).

Andere Karten bleiben nicht klickbar.
