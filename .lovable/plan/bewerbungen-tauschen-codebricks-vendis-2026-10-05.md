# Bewerbungen tauschen: Codebricks <-> Vendis

## Umfang (geprüft, Stand jetzt)
- **Codebricks -> Vendis:** 102 Bewerbungen mit Status „neu“, die **nicht** auf der Blacklist stehen (keine davon hat einen gebuchten Termin). Die 32 Blacklist-Einträge bei Codebricks bleiben unverändert bei Codebricks.
- **Vendis -> Codebricks:** alle 32 Blacklist-Bewerbungen mit Status „neu“ (keine mit Termin).

Blacklist = dieselbe E-Mail gibt es auch bei einem anderen Branding (gleiche Regel wie das rote Badge).

## Wichtig
- Die Vendis-Blacklist-Auswahl wird **vor** dem Umzug festgelegt. Sonst würden Codebricks-Bewerbungen, die gerade erst zu Vendis kommen, direkt wieder zurückwandern.
- Status bleibt „neu“. Keine E-Mails, keine SMS, keine Telegram-Nachrichten.

## Technisch
Ein Datenänderungsschritt: zuerst die IDs beider Gruppen festhalten (Vendis „neu“ mit E-Mail-Treffer bei einem anderen Branding; Codebricks „neu“ ohne E-Mail-Treffer bei einem anderen Branding), dann zwei `UPDATE public.applications SET branding_id = ...` per ID-Liste. Danach eine Kontrollabfrage der Zählungen.
