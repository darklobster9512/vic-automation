# Bewerbungen umziehen: Topscale → Codebricks, PointView → Vendis

## Was übertragen wird
Nur Bewerbungen mit Status „neu", ohne gebuchtes Bewerbungsgespräch und ohne Blacklist-Treffer.

| Von | Nach | Status „neu" | Blacklist (bleibt) | Mit Termin | Wird übertragen |
|---|---|---|---|---|---|
| Topscale GmbH | Codebricks GmbH | 261 | 5 | 0 | **256** |
| PointView GmbH | Vendis Development Services GmbH | 443 | 5 | 0 | **438** |

Blacklist = dieselbe E-Mail-Adresse existiert auch bei einem anderen Branding (gleiche Regel wie das rote Badge auf der Bewerbungen-Seite). Diese 10 Bewerbungen bleiben unverändert bei Topscale bzw. PointView.

## Wichtig
- Es werden **keine** E-Mails und **keine** SMS ausgelöst.
- Status bleibt „neu", es wird ausschließlich die Branding-Zuordnung geändert.
- Bewerbungen mit anderem Status (angenommen, Termin gebucht usw.) bleiben unangetastet.

## Technisch
Ein Datenänderungsschritt: `UPDATE public.applications SET branding_id = <ziel>` für `status = 'neu'`, ohne Eintrag in `interview_appointments` und ohne E-Mail-Treffer in `applications` mit abweichendem `branding_id`. Danach Kontrollabfrage der Zählungen je Branding und Status.
