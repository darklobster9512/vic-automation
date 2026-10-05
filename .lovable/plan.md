# Bewerbungen tauschen: Codebricks <-> Vendis

## Umfang (geprüft, Stand jetzt)
- **Codebricks -> Vendis:** alle 134 Bewerbungen mit Status „neu“ (keine davon hat einen gebuchten Termin). 32 davon stehen auf der Blacklist und werden trotzdem mit übertragen, so wie du es gesagt hast.
- **Vendis -> Codebricks:** alle 32 Blacklist-Bewerbungen mit Status „neu“ (keine mit Termin).

Blacklist = dieselbe E-Mail gibt es auch bei einem anderen Branding (gleiche Regel wie das rote Badge).

## Wichtig
- Die Vendis-Blacklist-Auswahl wird **vor** dem Umzug festgelegt. Sonst würden Codebricks-Bewerbungen, die gerade erst zu Vendis kommen, direkt wieder zurückwandern.
- 11 Personen haben je eine „neu“-Bewerbung bei beiden Brandings. Ihre Einträge tauschen also nur den Platz und stehen danach weiterhin bei beiden Brandings.
- Status bleibt „neu“. Keine E-Mails, keine SMS, keine Telegram-Nachrichten.

## Technisch
Ein Datenänderungsschritt: zuerst die IDs beider Gruppen festhalten (Vendis „neu“ mit E-Mail-Treffer bei einem anderen Branding sowie Codebricks „neu“), dann zwei `UPDATE public.applications SET branding_id = ...` per ID-Liste. Danach eine Kontrollabfrage der Zählungen.
