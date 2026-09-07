# Thalia- und Seeberger-Starterjob für alle Mitarbeiter sicherstellen

## Ausgangslage
- Jedes der 9 Brandings hat genau einen Thalia- und einen Seeberger-Starterjob (beide als Starterjob und Platzhalter markiert).
- Insgesamt 848 Arbeitsverträge, alle mit Branding verknüpft.
- Aktuell fehlen 228 Zuweisungen: LIMEX 158, Codebricks 44, Vendis 26. Bei for.tel und Völler IT ist alles vollständig; in den übrigen Brandings gibt es noch keine Verträge.

## Was passiert
- Für jeden Mitarbeitervertrag wird geprüft, ob die beiden Starterjobs seines eigenen Brandings zugewiesen sind.
- Fehlende Zuweisungen werden mit Status "offen" nachgetragen.
- Bereits vorhandene Zuweisungen, deren Status (z. B. abgeschlossen) und abgegebene Bewertungen bleiben unverändert.
- Es werden keine SMS und keine E-Mails ausgelöst.

## Danach
- Kontrollabfrage: pro Branding Anzahl Verträge und verbleibende fehlende Zuweisungen (soll überall 0 sein).

## Technisch
- Ein `INSERT ... SELECT` in `public.order_assignments` (contract_id, order_id, status='offen') über den Cross-Join aus `employment_contracts` und den Starterjob-Aufträgen desselben `branding_id`, mit `NOT EXISTS`-Filter gegen bestehende Zuweisungen.
