# Branding im Mitarbeiter-Panel wird nicht geladen

## Ursache (geprüft)

Das Mitarbeiter-Panel liest das Branding ausschließlich aus dem Profil-Feld `profiles.branding_id`. In der wiederhergestellten Datenbank ist dieses Feld bei **allen 813 Profilen leer** — dadurch wird kein Logo, keine Markenfarbe und kein Firmenname geladen, alles bleibt grau.

Die Zuordnung existiert aber sehr wohl: **alle 813 Arbeitsverträge** haben ein gesetztes Branding. Die Leserechte sind ebenfalls in Ordnung (Mitarbeiter dürfen ihr Branding über den Vertrag lesen).

## Lösung

1. **Daten nachziehen:** Bei allen Profilen das Branding aus dem zugehörigen Arbeitsvertrag (bzw. ersatzweise aus der Bewerbung) eintragen.
2. **Automatik für neue Konten:** Beim Anlegen/Zuweisen eines Arbeitsvertrags wird das Branding künftig automatisch ins Profil geschrieben, damit das Problem nicht wiederkehrt.
3. **Absicherung im Panel:** Falls im Profil doch einmal nichts steht, nutzt das Panel als Rückfallebene das Branding des Arbeitsvertrags. So sieht der Mitarbeiter immer Logo und Farbe.

## Technische Details

- Migration: `UPDATE public.profiles p SET branding_id = COALESCE(ec.branding_id, a.branding_id)` über `employment_contracts ec` (join `applications a`), nur wo `p.branding_id IS NULL`.
- Neuer Trigger auf `employment_contracts` (INSERT/UPDATE von `branding_id`/`user_id`, SECURITY DEFINER): setzt `profiles.branding_id`, wenn dort noch leer.
- `src/components/mitarbeiter/MitarbeiterLayout.tsx`: `brandingId = profile.branding_id ?? contract.branding_id`.
- Keine Änderung an Gehalts-, Vertrags- oder Auftragsdaten; keine SMS/E-Mails.
