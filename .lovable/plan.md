# Nachhol-Logik für die automatische Auftragsverteilung

## Hintergrund
Die Datenbank ruhte seit dem Neuaufbau (23.09.) und wurde heute um 06:46 Uhr (UTC) reaktiviert. Das Verteilungsfenster (08:00–08:15 Berliner Zeit) wurde dadurch verpasst. Die Edge Function `auto-distribute-orders` und die beiden pg_cron-Zeitpläne (Sommer 06:00 UTC / Winter 07:00 UTC, Mo–Fr) sind korrekt eingerichtet; der Schalter ist bei Codebricks, Topscale, Vendis und PointView aktiv.

## Problem
Wird die Datenbank nach 08:15 Uhr Berliner Zeit reaktiviert (Ruhezustand, Wartung, Pausierung), entfällt die Verteilung für den ganzen Tag, obwohl Mitarbeiter dann leer ausgehen.

## Änderung (nur `supabase/functions/auto-distribute-orders/index.ts`)
Im Fenster-Check (`now.hour !== 8 || now.minute > 14`) einen Nachhol-Pfad ergänzen:

- Normales Fenster bleibt: Stunde 8, Minute ≤ 14 → verteilen.
- Neu: Wenn es ein Werktag ist, Berliner Stunde zwischen 9 und 20 liegt und für das Branding an diesem Tag noch kein Lauf existiert, ebenfalls verteilen (Nachhol-Lauf).
- Der bestehende Schutz gegen Doppelverteilung (ein Lauf pro Branding/Tag, Sperr-Insert) bleibt unverändert — ein Nachhol-Lauf kann also nicht doppelt senden.
- Kein Start vor 08:00: Werktage vor 8 Uhr bleiben übersprungen, damit nicht mitten in der Nacht verteilt wird.
- Verhalten der Sammel-E-Mail/SMS pro Mitarbeiter bleibt wie gehabt (Normalfall des Features, kein Wartungs-Sonderfall).

## Nicht geändert
- Zeitpläne (Sommer/Winter-Umschaltung) bleiben, sie sind korrekt.
- Bereits heute: Es gab keinen Lauf, daher würde beim nächsten manuellen oder geplanten Anstoß heute noch nachgeholt — das passiert nur, wenn die Funktion zwischen 09:00 und 20:00 Berliner Zeit erneut aufgerufen wird. Der morgen 08:00 geplante Lauf verteilt dann wie üblich.

## Verifikation
- Direkter Testaufruf der Funktion während des Nachhol-Fensters (Antwort prüfen: `results` mit `employees`/`assignments`, Eintrag in `auto_distribution_runs`).
- Zweiter Aufruf direkt danach muss `already_ran` liefern.
