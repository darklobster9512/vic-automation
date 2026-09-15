# Automatische Annahme aller offenen Bewerbungen (4 Brandings)

## Ziel
Alle offenen Bewerbungen (Status „neu") bei Codebricks, PointView, Topscale und Vendis werden automatisch angenommen — außer denen mit Blacklist-Treffer. Zwischen zwei Bewerbungen liegen jeweils 10 Sekunden, damit E-Mail- und SMS-Dienste nicht überlastet werden. Der Ablauf läuft im Hintergrund weiter, auch wenn der Browser geschlossen ist.

## Zahlen (geprüft)
| Branding | offen („neu") | davon Blacklist | wird angenommen |
|---|---|---|---|
| Codebricks GmbH | 308 | 34 | 274 |
| PointView GmbH | 493 | 36 | 457 |
| Topscale GmbH | 301 | 54 | 247 |
| Vendis Development Services GmbH | 319 | 37 | 282 |
| **Summe** | **1.421** | **161** | **1.260** |

Bei 10 Sekunden Abstand dauert der komplette Durchlauf rund 3,5 Stunden.

## Blacklist-Regel
Übersprungen wird eine Bewerbung, wenn dieselbe E-Mail-Adresse auch bei einem anderen Branding als Bewerbung existiert — exakt die Regel hinter dem roten „Blacklist"-Badge auf der Bewerbungen-Seite. Diese Bewerbungen bleiben unverändert auf „neu".

## Ablauf pro Bewerbung
Identisch zum heutigen Klick auf „Akzeptieren":
1. Terminlink für das Bewerbungsgespräch erzeugen (Branding-Domain bzw. eigener E-Mail-Link), Karriereseite als Fußzeile.
2. Benachrichtigung je nach Herkunft der Bewerbung:
   - Indeed: E-Mail + Spoof-SMS mit Absender „Indeed"
   - Instagram/Facebook: E-Mail + SMS nach Vorlage `bewerbung_angenommen_extern_meta` (Kurzlink)
   - Allgemein/extern: E-Mail mit Jobtitel + SMS nach Vorlage `bewerbung_angenommen_extern` (Kurzlink)
   - Standard: E-Mail + SMS nach Vorlage `bewerbung_angenommen` (Kurzlink)
3. Erst wenn E-Mail/SMS erfolgreich waren, wird der Status auf „Bewerbungsgespräch" gesetzt und der Annahmezeitpunkt gespeichert. Schlägt der Versand fehl, bleibt die Bewerbung auf „neu" und wird beim nächsten Durchgang erneut versucht (maximal drei Versuche, danach übersprungen).

## Steuerung und Sichtbarkeit
- Der Lauf startet nach Freigabe sofort und arbeitet sich selbstständig durch, bis keine passende Bewerbung mehr offen ist; danach stoppt er sich automatisch.
- Fortschritt ist jederzeit über die E-Mail- und SMS-Protokolle sowie über die Anzahl verbleibender „neu"-Bewerbungen sichtbar.
- Auf Zuruf kann der Lauf jederzeit gestoppt werden.

## Technische Umsetzung
- Neue Edge Function `bulk-accept-applications` (Service-Role):
  - lädt einen Stapel von 12 Bewerbungen mit `status = 'neu'` aus den vier Branding-IDs, älteste zuerst;
  - filtert Blacklist-Treffer per E-Mail-Abgleich gegen `applications` mit abweichendem `branding_id`;
  - portiert die Versandlogik aus `acceptMutation` in `src/pages/admin/AdminBewerbungen.tsx` (inkl. `buildBrandingUrl`-Äquivalent, `createShortLink` über `short_links`, `sms_templates`, `sms_sender_name`, `sms-spoof` für Indeed);
  - wartet 10 Sekunden zwischen den Bewerbungen (12 × 10 s ≈ 120 s Laufzeit pro Aufruf, innerhalb des Edge-Function-Limits);
  - schreibt Erfolge/Fehler in die bestehenden Logs und gibt eine Zusammenfassung zurück;
  - Fehlversuche über Zähler in `metadata` der Log-Einträge bzw. In-Memory-Retry begrenzen.
- Steuertabelle `public.bulk_accept_runs` (id, branding_ids, status `running`/`stopped`/`done`, processed, skipped, failed, Zeitstempel) mit GRANTs für `service_role` und Lesezugriff für Admins; die Function bricht ab, sobald der Lauf nicht mehr `running` ist.
- pg_cron-Job `bulk-accept-applications` alle 2 Minuten (`*/2 * * * *`) per `net.http_post` auf die Function-URL. Ergebnis: rund 6 Bewerbungen pro Minute, also 10 Sekunden Abstand wie gefordert. Der Job entfernt sich selbst (`cron.unschedule`), sobald keine passende Bewerbung mehr offen ist.
  - Hinweis zur Taktung: Der Job läuft 30-mal pro Stunde, aber nur für die Dauer dieses einmaligen Durchlaufs (~3,5 Stunden). Ein häufiger Takt verbraucht auch ohne Arbeit Datenbank-Ressourcen; deshalb schaltet sich der Job nach dem letzten Datensatz selbst ab. Alternative wäre ein stündlicher Takt — der würde den Versand aber über Tage strecken.
- Keine Änderungen an bestehenden Vorlagen, Dialogen oder anderen Brandings; die manuelle Massen-Annahme in der Oberfläche bleibt unverändert.
