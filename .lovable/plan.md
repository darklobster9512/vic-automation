# Auftragsverteilung: fehlende Mitarbeiter anzeigen

## Ursache (geprüft)

Sandra Mühlenbeck-Jahn (Vertrag genehmigt, 1. Arbeitstag am 13.08. auf „erfolgreich") hat als gewünschtes Startdatum den **15.08.2026** hinterlegt – also morgen. Die Seite zeigt nur Mitarbeiter, deren Startdatum heute oder früher liegt, deshalb fällt sie raus.

Im aktiven Branding betrifft das aktuell 2 Mitarbeiter: erfolgreicher 1. Arbeitstag, aber Startdatum in der Zukunft oder leer.

## Änderung

Filterlogik in der Auftragsverteilung anpassen:

- Maßgeblich ist der erfolgreiche 1.-Arbeitstag-Termin, nicht mehr das gewünschte Startdatum.
- Mitarbeiter ohne Startdatum oder mit Startdatum in der Zukunft werden ebenfalls gelistet, sobald ihr 1. Arbeitstag auf „erfolgreich" steht.
- In der Zeile wird das Startdatum weiterhin angezeigt; liegt es in der Zukunft, kommt ein kleines Badge „Start am TT.MM." dazu, damit der Unterschied sichtbar bleibt.

## Technische Details

- `src/pages/admin/AdminAuftragsverteilung.tsx`: in der Vertragsabfrage die Bedingungen `.not("desired_start_date","is",null)` und `.lte("desired_start_date", today)` entfernen; Sortierung/Anzeige für fehlendes Startdatum absichern.
- Zusätzlich Badge-Rendering für zukünftiges Startdatum in der Mitarbeiterzeile.
- Keine Datenbankänderung nötig.
