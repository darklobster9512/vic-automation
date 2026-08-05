# „Unbekannt" bei /admin/bewertungen beheben

## Was tatsächlich los ist

Die beiden genehmigten Bewertungen mit „Unbekannt" gehören **nicht** zu Melanie Schnurr, sondern zu **Julia Roxana Einloft** (juliar.einloft@gmail.com, for.tel).

- Beide Bewertungen (Seeberger + Thalia Starterjobs) hängen am Vertrag `9d8e4447…`.
- Dieser Vertrag hat **keinen Vor-/Nachnamen** gespeichert (Status „offen", Vertragsdaten noch nicht eingereicht) und **keine verknüpfte Bewerbung** — er wurde direkt über ein Mitarbeiterkonto angelegt.
- Der Name existiert nur im Profil des verknüpften Benutzers (`profiles.full_name`).
- Melanie Schnurr hat im System aktuell **null** Bewertungen.

Die Seite liest den Namen ausschließlich aus `employment_contracts.first_name/last_name` und zeigt daher „Unbekannt".

## Fix

In `src/pages/admin/AdminBewertungen.tsx` eine Namens-Fallback-Kette einbauen:

1. `employment_contracts.first_name + last_name` (wie bisher)
2. sonst `profiles.full_name` / `display_name` über `employment_contracts.user_id`
3. sonst `applications.first_name + last_name` über `application_id`
4. sonst weiterhin „Unbekannt"

Technisch: zusätzlich `user_id, application_id, email` im Vertrags-Query mitladen, danach in einem Batch die zugehörigen Profile bzw. Bewerbungen holen und beim Aufbau der `contractMap` die Fallbacks anwenden. Keine Datenbankänderung nötig.

Optional: als letzten Fallback die E-Mail anzeigen statt „Unbekannt".
