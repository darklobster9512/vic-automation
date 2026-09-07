# SMS an heutige Gesprächstermine (technische Probleme)

Heute (07.09.2026) gibt es in den fünf genannten Brandings 34 gebuchte Gesprächstermine:
- Codebricks GmbH: 14
- Vendis Development Services GmbH: 12
- LIMEX Solutions GmbH: 5
- PointView GmbH: 3
- Topscale GmbH: 0

Alle stehen auf "Termin gebucht".

## Was passiert

Jede dieser 34 Personen bekommt eine SMS vom Absendernamen des jeweiligen Brandings mit dem Hinweis auf die heutigen technischen Probleme und einem persönlichen Link, um bei ausgebliebenem Anruf selbst einen neuen Termin zu buchen.

Text:

"Hallo {Vorname}, leider hatten wir heute technische Probleme. Falls Sie von uns keinen Anruf erhalten haben, buchen Sie bitte hier einen neuen Gesprächstermin: {Link}"

Der Link ist derselbe verkürzte Umbuchungslink, der auch bei der normalen Gesprächserinnerung verwendet wird, und führt zum Buchungsbereich der jeweiligen Bewerbung im richtigen Branding.

Es wird keine E-Mail und keine Telegram-Meldung ausgelöst, und die Termine selbst bleiben unverändert.

## Technische Umsetzung

- Zielmenge: `interview_appointments` mit `appointment_date = current_date`, verknüpfte `applications` mit `branding_id` der fünf Brandings und vorhandener Telefonnummer.
- Pro Empfänger: `short_links`-Eintrag auf `https://{prefix}.{domain}/bewerbungsgespraech/{application_id}` (gleiche Logik wie `handlePrepareReminder`), danach Versand über die Edge Function `send-sms` mit `branding_id` und `sms_sender_name` des Brandings.
- Event-Typ `gespraech_technische_stoerung`, damit der Versand in `sms_logs` getrennt nachvollziehbar bleibt; `reminder_count` wird nicht hochgezählt.
- Ausführung als einmaliger Lauf über eine temporäre Edge Function (Service-Role), gedrosselt gegen Rate-Limits; die Hilfsfunktion wird danach wieder entfernt.
