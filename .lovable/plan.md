# „Unbekannt" bei /admin/bewertungen beheben

## Korrektur

Du hast recht: Der Vertrag gehört zum Branding **LIMEX Solutions GmbH** (`371a2e6c…`), nicht zu for.tel. Ich hatte die Branding-IDs vorher vertauscht.

## Was tatsächlich los ist

Die beiden genehmigten Bewertungen mit „Unbekannt" (Starterjobs Seeberger + Thalia, LIMEX) hängen alle am Vertrag `9d8e4447…`:

- Der Vertrag hat **keinen Vor-/Nachnamen** gespeichert (Status „offen", Vertragsdaten noch nicht eingereicht) und **keine verknüpfte Bewerbung** (`application_id` ist leer).
- Der einzige Name im System steht im Profil des verknüpften Benutzers: **Julia Roxana Einloft** (juliar.einloft@gmail.com), ebenfalls LIMEX.
- Melanie Schnurr hat einen eigenen LIMEX-Vertrag (`33d427ab…`, Status „eingereicht"), aber dazu existieren **null** Bewertungen.

Die Bewertungsseite liest den Namen ausschließlich aus `employment_contracts.first_name/last_name` — deshalb „Unbekannt".

## Fix

In `src/pages/admin/AdminBewertungen.tsx` eine Namens-Fallback-Kette einbauen:

1. `employment_contracts.first_name + last_name` (wie bisher)
2. sonst `profiles.full_name` / `display_name` über `employment_contracts.user_id`
3. sonst `applications.first_name + last_name` über `application_id`
4. sonst E-Mail, erst danach „Unbekannt"

Technisch: zusätzlich `user_id, application_id, email` im Vertrags-Query mitladen, danach in je einem Batch-Query die zugehörigen Profile bzw. Bewerbungen holen und beim Aufbau der `contractMap` die Fallbacks anwenden. Keine Datenbankänderung nötig.
