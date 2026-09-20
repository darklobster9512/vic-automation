# Automatische Auftragsverteilung pro Branding

Pro Branding lässt sich einstellen, ob die täglichen Platzhalteraufträge automatisch verteilt werden. Ist es aktiv, bekommen alle Mitarbeiter mit offenen Zuweisungen werktags um Punkt 08:00 Uhr Berliner Zeit ihre Aufträge automatisch – inklusive der gewohnten E-Mail/SMS-Benachrichtigung (eine Sammelnachricht pro Mitarbeiter).

## 1. Schalter pro Branding

- Neues Feld „Automatische Auftragsverteilung" (an/aus, Standard: aus) im Branding-Formular unter `/admin/brandings`.
- Zusätzlich derselbe Schalter oben auf `/admin/auftragsverteilung`, damit man ihn dort direkt für das aktive Branding umlegen kann, samt Hinweis „Läuft werktags um 08:00 Uhr" und Anzeige, ob heute schon automatisch verteilt wurde.

## 2. Was der automatische Lauf macht

Genau dieselbe Logik wie der Button „Aufträge zuweisen" im Panel:

- Nur Mitarbeiter des Brandings mit erfolgreichem 1. Arbeitstag, Startdatum erreicht, nicht gesperrt.
- Zielmenge pro Tag je Stundengruppe aus den eingestellten Sollwerten (`distribution_targets`, Defaults 5→2, 10→3, 20→3, 25→4, sonst 4).
- Es werden nur die heute noch fehlenden Aufträge nachgelegt (wer schon versorgt ist, bekommt nichts).
- Zufällige Auswahl aus den Platzhalteraufträgen des Brandings, nie ein Auftrag, den der Mitarbeiter schon einmal hatte.
- Pro Mitarbeiter eine Sammel-E-Mail und eine Sammel-SMS – nie mehrere Nachrichten hintereinander.
- Reichen die Platzhalteraufträge nicht, wird nur so viel verteilt wie möglich; der Rest wird im Lauf-Protokoll vermerkt.
- Samstag und Sonntag: kein Lauf.

## 3. Protokoll

Jeder automatische Lauf wird protokolliert (Datum, Branding, Anzahl versorgter Mitarbeiter, Anzahl Zuweisungen, Warnung bei knappen Platzhalteraufträgen). Das Protokoll verhindert gleichzeitig einen Doppelversand am selben Tag und wird auf `/admin/auftragsverteilung` als Statuszeile angezeigt.

## Zeitplan-Hinweis

Damit der Versand zufällig innerhalb des Fensters 08:00–08:30 liegt, prüft ein Zeitplan werktags alle 10 Minuten im Zeitraum 06:00–07:59 UTC (deckt Sommer- und Winterzeit ab), also 12 kurze Prüfungen pro Werktag. Die meisten dieser Prüfungen finden nichts zu tun und beenden sich sofort; sie verursachen minimale Datenbanklast. Alternative wäre ein einziger fixer Zeitpunkt (z. B. exakt 08:00), dann entfällt die Zufallsstreuung im Fenster. Ich setze die Variante mit dem Fenster um, wenn du nichts anderes sagst.

## Technische Details

- Neue Spalte `brandings.auto_distribution_enabled boolean not null default false` (Migration) und Einbindung in `src/pages/admin/AdminBrandingForm.tsx` sowie in den Kopfbereich von `src/pages/admin/AdminAuftragsverteilung.tsx`.
- Neue Tabelle `public.auto_distribution_runs` (id, branding_id, run_date, employees_served, assignments_created, warnings jsonb, created_at) mit Unique auf (branding_id, run_date), GRANTs für `service_role` und Leserecht für Admin/Kunde per RLS.
- Neue Edge Function `auto-distribute-orders` (Service-Role): ermittelt Berliner Lokalzeit, bricht ab außerhalb Mo–Fr 08:00–08:30, iteriert über alle Brandings mit aktiviertem Schalter, überspringt Brandings mit vorhandenem Lauf-Eintrag für heute, zieht Verträge/`first_workday_appointments`/`orders`/`order_assignments` per `.range()`-Batching, legt Zuweisungen als Bulk-Insert an und ruft je Mitarbeiter die Sammel-Benachrichtigung auf (Portierung der Logik aus `src/lib/assignmentNotification.ts` in ein Deno-Modul, Aufruf von `send-email`/`send-sms` direkt ohne Queue).
- Zufallsstreuung: pro Branding und Tag wird aus Branding-ID + Datum ein Startoffset (0–25 Minuten) abgeleitet; die Funktion verteilt erst, wenn dieser Zeitpunkt erreicht ist.
- pg_cron-Job `auto-distribute-orders` mit `'*/10 6,7 * * 1-5'` und `net.http_post` auf die Funktions-URL inkl. Publishable Key.
- Manuelle Verteilung über `DistributionDialog` bleibt unverändert; andere Brandings ohne Schalter bleiben unberührt.
